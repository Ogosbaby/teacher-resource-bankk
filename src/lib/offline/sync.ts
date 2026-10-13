/**
 * Best-effort sync of the local term pass to the server.
 *
 * Local-first means the answer to "does this device have a pass?" never depends
 * on this call. It runs in the background, its result is not awaited by any UI,
 * and every failure mode is a normal outcome rather than an error to show:
 *
 *   - `no-session`  the teacher registered offline and has no server account here
 *   - `offline`     there is no connection right now
 *   - `rejected`    the server refused the code or the pass payload
 *   - `conflict`    the code is already attached to another account (see below)
 *   - `revoked`     the server has cancelled this code outright (see below)
 *   - `not-active`  there is nothing worth syncing
 *
 * `conflict` and `revoked` are the two outcomes with teeth, and they share a
 * shape: the server knows something the device cannot. A single install cannot
 * tell that a code was redeemed on someone else's phone, and it cannot tell that
 * a code was cancelled after it was redeemed. So when the server says either,
 * this device's pass was not earned: the code is blocked locally
 * (`blockCodeLocally`, so it stays refused offline) and the pass is revoked,
 * along with the device token — a "recognised" device slides past the splash into
 * the app, so clearing only the pass would leave the teacher half-signed-in. A
 * demo pass has no code and is never revoked here.
 *
 * The call is also how the device *learns* about revocations it had no way to see
 * — including codes it never redeemed, which is what lets the wizard refuse a
 * cancelled code to a teacher who is only now typing it in. Those arrive on
 * responses whatever the status, and are merged rather than replacing anything
 * already known.
 *
 * The sync retries on launch and on the browser's `online` event
 * (`startSyncRetryLoop`), so a pass minted offline still reaches the server
 * eventually: a successful sync is recorded on the pass (`markTermPassSynced`)
 * and only unsynced passes are ever re-sent.
 */
import {
  getTermPass,
  markTermPassSynced,
  clearTermPass,
  markTermPassRevoked,
  isDemoPassCode,
} from "./term-pass";
import { blockCodeLocally, clearDeviceToken, getDeviceId } from "./device";
import {
  applyShippedRevocations,
  reconcileTermPassWithRevocations,
  recordRevocations,
  recordSignedRevocations,
  type RevocationEntry,
  type SignedRevocationList,
} from "./activation-revocations";

export type SyncOutcome =
  | "synced"
  | "no-session"
  | "offline"
  | "rejected"
  | "conflict"
  | "revoked"
  | "not-active";

/** The parts of the sync response this module reads. Everything else is ignored. */
interface SyncResponseBody {
  error?: string;
  revocations?: RevocationEntry[];
  revocationsDocument?: SignedRevocationList;
}

/**
 * Take whatever revocations the server included.
 *
 * A signed document is preferred and is the only form the device can check for
 * itself; when one is present but fails verification, nothing is recorded —
 * falling back to the unsigned duplicate of the same list would defeat the point
 * of having signed it.
 *
 * Awaited rather than fired and forgotten: the signature check is async, and a
 * caller (or a test) that inspects the store immediately after the sync should
 * see the result of it.
 */
async function learnRevocations(body: unknown): Promise<void> {
  if (!body || typeof body !== "object") return;
  const { revocations, revocationsDocument } = body as SyncResponseBody;

  if (revocationsDocument?.signature) {
    await recordSignedRevocations(revocationsDocument);
    return;
  }
  if (Array.isArray(revocations)) recordRevocations(revocations, "server");
}

export async function syncTermPassWithServer(): Promise<SyncOutcome> {
  const pass = getTermPass();
  if (!pass || pass.expiresAt <= Date.now()) return "not-active";

  const isDemo = isDemoPassCode(pass.code);

  try {
    const res = await fetch("/api/subscriptions/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: pass.token,
        // A demo pass has no code; the server clamps those to its own ceiling.
        code: isDemo ? null : pass.code,
        deviceId: getDeviceId(),
      }),
    });

    if (res.status === 401 || res.status === 403) return "no-session";

    const body = (await res.json().catch(() => null)) as SyncResponseBody | null;

    // Read the body whatever the status. A 200 for a healthy pass can still carry
    // revocations for other codes, and that is the only channel that reaches a
    // device whose own code is fine.
    await learnRevocations(body);

    if (res.status === 410) {
      // The server cancelled this code. Recording it before reconciling keeps one
      // implementation of "this device loses its pass", shared with the launch
      // path — and persists the cancellation, so the code stays refused here even
      // if the device never gets online again.
      if (!isDemo) {
        recordRevocations([{ code: pass.code }], "server");
        reconcileTermPassWithRevocations();
      }
      return "revoked";
    }

    if (res.status === 409) {
      if (!isDemo) {
        blockCodeLocally(pass.code);
        clearTermPass();
        // Also drop the device token: the registration behind this device was
        // not paid for, so the device should not stay "recognised" and slide
        // past the splash straight into the app. It goes back to registration.
        clearDeviceToken();
        markTermPassRevoked(
          "Your activation code was activated on another account, so the pass on this device was removed. Enter a valid code to continue."
        );
      }
      return "conflict";
    }

    if (!res.ok) return "rejected";

    markTermPassSynced();
    return "synced";
  } catch {
    return "offline";
  }
}

/**
 * The background chore, run on launch and whenever the browser reports it is back
 * online.
 *
 * Revocation is handled first and independently of the sync: a device whose pass
 * is already settled still has to stop honouring a code that was cancelled while
 * it was away, and the shipped list is verifiable with no network at all. Only
 * after that is an unsynced pass worth sending.
 */
export async function retryPendingSync(): Promise<void> {
  await applyShippedRevocations();
  reconcileTermPassWithRevocations();

  const pass = getTermPass();
  if (!pass || pass.syncedAt || pass.expiresAt <= Date.now()) return;
  await syncTermPassWithServer();
}

/**
 * Keep trying to sync until it sticks.
 *
 * The registration-time sync usually runs while the teacher is offline or before
 * they have a session, so without this the server would never learn about the
 * pass. A `catch`-and-forget outcome could not be retried, so the pass carries a
 * `syncedAt` marker instead and this loop only ever touches unsynced passes.
 *
 * Returns a cleanup function — the listener must be removed on unmount or React
 * Strict Mode's double-invocation would leave a second copy behind.
 */
export function startSyncRetryLoop(): () => void {
  if (typeof window === "undefined") return () => {};

  let inFlight = false;

  const attempt = () => {
    if (inFlight) return;
    inFlight = true;
    void retryPendingSync().finally(() => {
      inFlight = false;
    });
  };

  attempt();
  window.addEventListener("online", attempt);
  return () => window.removeEventListener("online", attempt);
}
