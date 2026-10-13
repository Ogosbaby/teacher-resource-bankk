# Teacher Resource Bank

LMS for Nigerian teachers: CPD courses and learning paths, an AI-drafted /
human-reviewed resource bank, and a RAG chatbot backed by a locally hosted
Qwen model.

## Stack

- Next.js 14 App Router + React + TypeScript
- Tailwind CSS (+ `@tailwindcss/typography`) — black / white / grey theme
- Postgres + pgvector on **Neon (cloud)** — no local or Docker Postgres
- Drizzle ORM — `src/lib/db/migrations/*.sql` are the source of truth for
  constraints and indexes; `src/lib/db/schema.ts` mirrors them for typed queries
- Auth.js v5 (`next-auth@5.0.0-beta.20`), JWT sessions, Credentials (bcrypt)
  plus an optional Google provider
- Ollama serving a local model (`qwen-local`) over the OpenAI-compatible API
- pg-boss for background jobs (Postgres-backed; no Redis)
- Paystack — **deferred**, payment UI is an explicitly labelled demo placeholder

## Setup

Git Bash on Windows. No Docker required.

1. `cp .env.example .env` and fill in `DATABASE_URL` (Neon pooled connection
   string) and `AUTH_SECRET` (`openssl rand -base64 32`).
2. `npm install`
3. Apply any unapplied migrations:
   ```
   npm run db:migrate            # applies every pending *.sql in order
   npm run db:migrate -- 0004_add_resource_body.sql   # or one specific file
   ```
   `0001_init.sql` creates the base tables and the pgvector extension.
4. `npm run seed` — creates `admin@trb.local / ChangeMe123!` and
   `teacher@trb.local / Teacher123!` (teacher gets an active demo subscription).
5. `npm run dev`, and in a second terminal `npm run worker` for background jobs.

> **The worker is a separate process.** Certificate PDFs and content embeddings
> are produced by it. Without `npm run worker` running, publishing still works
> and completion still succeeds — jobs simply stay queued until it starts.

### Optional: demo content

```bash
npm run db:seed-demo            # 6 published courses with modules, teacher enrolled in 3
npm run db:seed-demo -- --clear # remove everything it created (slugs are "demo-" prefixed)
```

This writes real rows to your database, so it is opt-in and never runs as part
of `npm run seed`.

### File storage

Certificates are written through a small storage abstraction (`src/lib/storage`)
that mirrors the AIProvider pattern: interface, concrete providers, singleton
getter. It picks a backend automatically:

| Condition | Backend | Where files go |
|---|---|---|
| R2 env vars set | Cloudflare R2 (S3 API) | your bucket |
| R2 env vars absent | Local filesystem | `.storage/` in the project |

The local backend exists so certificate generation is testable without cloud
credentials. It is **not** durable and is not for production. To point it at
your own path, set `STORAGE_LOCAL_DIR`.

R2 vars (all four required to activate it): `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. The account id is
turned into the S3 endpoint for you (`https://<account>.r2.cloudflarestorage.com`);
set `R2_ENDPOINT`/`R2_BUCKET` instead to point at any other S3-compatible service.
A public URL is not needed — certificate and resource downloads stream through
visibility-checked API routes rather than a public bucket URL.

### AI features

Ollama must be running as a standing background process before anything AI
related will work — it is **not** started by `npm run dev`:

```bash
ollama serve --embeddings        # --embeddings is required for retrieval
ollama list                      # confirm "qwen-local" and "mxbai-embed-large"
```

Two different models are needed, and they are not interchangeable:

| Purpose | Env var | Model | Notes |
|---|---|---|---|
| Chat | `QWEN_MODEL` | `qwen-local` | generative |
| Embeddings | `QWEN_EMBEDDING_MODEL` | `mxbai-embed-large` | 1024 dims |

```bash
ollama pull mxbai-embed-large
npm run db:seed-exemplars        # embeds the KB router's example questions
```

A generative model will **not** produce usable embeddings, which is why the
provider refuses to fall back to `QWEN_MODEL` and errors instead. Without
`--embeddings` the server returns HTTP 501.

`Modelfile` documents the local model the `qwen-local` tag was built from — build
the tag from your own GGUF with:

```bash
ollama create qwen-local -f Modelfile
```

The registration flow also probes the model host through `/api/model/local`, which
queries Ollama's native `/api/tags` (the OpenAI-compatible endpoint can't list
installed models). If `QWEN_MODEL` is installed, provisioning finishes instantly
and reports the real model size; the simulated transfer is only a fallback for
when no local model is present.

### Activation codes

Codes are minted and signed so the app can validate them with **no network call**:

```bash
npm run codes:generate -- --count=12 --months=3 --note=pilot
# --fresh starts a new batch instead of adding to the existing one
```

This writes `src/lib/offline/activation-batch.json` — committed, because it holds
only the *public* key and the codes — and keeps the signing key in
`.activation-keys/` (gitignored). **Never commit that key.** Losing it means
rotating the shipped public key with a new batch; leaking it means anyone can mint
codes the app will trust.

The app verifies the batch signature once (ECDSA P-256 over a canonical payload)
and only then treats redemption as a membership test. The same verifier runs
server-side in `/api/subscriptions/sync`, which is why the client may name a code
but never decides how many months that code is worth.

#### Revoking a single code

Rotating the batch drops a code, but only on the next app load and only by
shipping a build. Cancelling *one* code that has already been redeemed is a
separate mechanism, and it has two delivery channels feeding a single encrypted
store on the device:

```bash
npm run db:migrate -- 0007_add_activation_revocations.sql
npm run codes:revoke -- --code=TRB-XXXX-XXXX --reason="refunded, duplicate purchase"
npm run codes:revoke -- --code=TRB-XXXX-XXXX --undo
npm run codes:revoke -- --list
```

The command writes the `activation_revocations` table — what `/api/subscriptions/sync`
reports, so a connected phone learns about the cancellation immediately, and what
makes a cancelled code answer **410** instead of syncing a pass — and re-signs
`src/lib/offline/activation-revocations.json`, which is what ships in the bundle
so an offline device honours the cancellation too. `--no-db` writes only the file.
The file is written *before* the database deliberately: an interrupted run should
leave a code cancelled offline rather than live everywhere. The command refuses to
run without a `--reason`, and refuses to run at all if the signing key is missing
or does not match the shipped batch's public key — a revocation signed with the
wrong key looks applied and has no effect, which is the one outcome worth failing
loudly on.

The shipped list is verified against the **batch's** shipped public key, not
against a key the document carries, so it cannot authorise itself. The sync route
signs the list it reports as well, whenever `ACTIVATION_SIGNING_KEY` holds that
same P-256 keypair, because the live channel is the one a school proxy with an
installed root certificate could otherwise forge: cancelling a teacher's code is
not a privilege escalation, but it is a denial of service, and revocations are
merged and never expire. Without the key the route reports the plain list, which
is all local development needs.

`npm run verify:offline` exercises the whole offline flow — encryption, device
recognition, signed codes, per-code revocation (the signed list, the store, and
the pass it drops), cross-device reuse rejection, term passes and the draft store
— against an in-memory storage shim.

### Renewal reminders

A pass lapsing breaks nothing immediately — that is the point of a pass, and also
why it is easy to miss. So a scheduled job finds subscriptions close to expiry and
queues a reminder:

```bash
npm run db:migrate -- 0008_reminder_uniqueness.sql
npm run verify:reminders
```

The worker runs `renewal-scan` daily at 06:00. The cron lives in Postgres rather
than in the worker, so several workers cannot each schedule their own scan. The
scan only *queues*: one `reminder_queue` row per subscription, enforced by a
unique index, so a retried or overlapping scan cannot nag twice. It then fans out
one delivery job per row, and delivery re-checks the subscription before sending —
a reminder that is no longer true, because the teacher renewed while it sat on the
queue, is dropped rather than sent.

**Nothing sends mail yet.** No email provider is configured anywhere in this
project, so `deliverRenewalReminder` logs exactly what would have gone out and the
row is still marked `sent_at`. Replacing that one function body is the whole job of
wiring a provider.

### Resource files

`resources.file_storage_key` used to be a placeholder on every row, so nothing
could tell "this resource has a file" from "this resource is text-only". A real
upload now goes through the storage abstraction and records what it stored:

```bash
npm run db:migrate -- 0009_resource_files.sql
npm run resources:attach -- --slug=scheme-of-work-jss2 --file=./scheme.pdf
npm run resources:attach -- --slug=scheme-of-work-jss2          # show what is attached
npm run resources:attach -- --slug=scheme-of-work-jss2 --detach
npm run verify:files
```

`POST /api/resources/[id]/file` is the same operation over HTTP — admin-only,
multipart under a `file` field — and `GET /api/resources/[id]/download` streams it
to signed-in teachers, re-checking visibility on every request so storage never has
to be public. `file_uploaded_at` is what "has a file" means: the download route
trusts that column rather than inferring anything from the key's shape. Attaching
replaces the previous object only *after* the new one is written and the row moved,
so a failure at any point leaves the resource readable instead of pointing at a
deleted file.

Accepted types and the 25 MB ceiling are stated in
`src/lib/content/resource-files.ts` and enforced in the service, which is why the
CLI cannot store something the endpoint would refuse.

> **There is no upload UI, because there is no admin area in this tree.**
> `src/app/admin/**` is gone, so an upload form has nowhere to live. The endpoint
> is ready for one; until then files are attached with the CLI above.

The assistant degrades rather than breaks: with no embedding model configured,
chat still works but answers without platform grounding, and `/api/chat` reports
this in the `X-Retrieval-Status` response header (`grounded` | `empty` |
`unavailable`). `/admin/dashboard` shows the same status.

> **Changing the embedding model** to one with a different vector width requires
> a migration that drops and recreates the `embedding` columns on
> `content_embeddings` and `kb_route_exemplars` plus their HNSW indexes, then
> re-embedding everything. `EMBEDDING_DIMENSION` in `src/lib/ai/embedding.ts`
> and the `VECTOR(...)` widths in `0001_init.sql` must stay in step.

## Verification

Five suites, in increasing scope:

| Command | Needs | Covers |
|---|---|---|
| `npm run verify:offline` | nothing | encryption, device recognition, signed codes, per-code revocation, cross-device reuse rejection, term passes, draft store |
| `npm run verify:sync` | a running server + database | the real sync route over HTTP, with real NextAuth sessions and real Postgres writes — including cross-account code rejection and per-code revocation (410, list delivery, subscription refund) |
| `npm run verify:reminders` | a database | the renewal scan: queuing, idempotency, delivery, and a reminder dropped because the teacher renewed |
| `npm run verify:files` | a database + writable storage | attaching a resource file: key shape, replace-without-orphaning, refusals, detach |
| `npm run walkthrough` | a running server + Chrome | the wizard and splash in a real browser: validation, level-filtered subjects, refresh resume, storage encryption, splash routing, and a revoked code being refused |

Both server-backed suites expect something already listening. Build, then:

```bash
PORT=3100 npm run start        # in one terminal
E2E_BASE_URL=http://localhost:3100 npm run verify:sync
E2E_BASE_URL=http://localhost:3100 npm run walkthrough
```

`npm run walkthrough` drives the Chrome already on the machine through
`playwright-core`, so it downloads no browser. Only a browser can show that Step 3
really filters, that a refresh resumes mid-flow, and that the splash actually
waits out its blink cycle.

> `verify:sync` creates its own throwaway teacher accounts and deletes them, along
> with any subscriptions and terms it created. The seeded teacher and admin are
> never touched, and revocation is exercised against a synthetic code
> (`TRB-E2E9-TEST`) rather than a real one, so a failed run cannot leave a pilot
> teacher locked out. `verify:reminders` and `verify:files` follow the same rule:
> throwaway rows, removed afterwards.

Scripts run through `tsx` and may import services directly, path alias and all —
`tsx` resolves `@/…` from `tsconfig.json`, so a script calls the same service a
route does rather than keeping a second copy of the rules.

## Build status

**Working end to end:** auth (credentials, optional Google), the offline-first
4-step registration wizard, the launch splash screen with device recognition,
encrypted local storage for the device token / term pass / in-progress
registration, the activation-code bypass with device-UUID binding, subscription
gating via a live DB check in a Server Component layout, the global floating
chat widget with streaming and persistence, the marketing landing page, and the
teacher billing and certificates pages (auth-gated only, never
subscription-gated).

**Working end to end (continued):** the reformed Nigerian curriculum as the
single source of truth for class levels and subjects
(`src/lib/content/curriculum.ts`), whose level-tagged subject pools
(`primary_mathematics`, `jss_maths`, `sss_physics`) drive both the wizard's
dynamic Step 3 filtering and the subject browse pages; chunked embeddings on
publish via a pg-boss job; query-time pgvector retrieval in `/api/chat`; and an
exemplar-similarity KB router between the resource bank and platform help.

**Working end to end (continued):** teacher enrollment and module-level
progress, course completion that refuses while any published module is
outstanding, certificate issuing through a pg-boss job into R2-or-local
storage, and an ownership-checked PDF download. Issuing is idempotent — derived
storage keys plus partial unique indexes mean a retried or duplicated job cannot
double-issue.

**Working end to end (continued):** the best-effort sync of a device-minted term
pass up to the server. It is retried on launch and again on the browser's
`online` event until the pass carries a `syncedAt` marker
(`startSyncRetryLoop`, mounted once through `OfflineSyncBridge` in the root
layout), so a pass minted while offline still reaches the server eventually. A
pass the server reports as conflicting is not just ignored: its code is blocked
locally and both the pass and the device token are cleared, dropping the device
back to registration. The same call carries per-code revocations — a signed
list when the server has the signing key, and a plain one otherwise — which are
merged into the device's revocation store so a cancelled code stays refused even
after the connection goes away again.

**Working end to end (continued):** the scheduled renewal reminder scan and its
delivery queue (`verify:reminders`), and resource files stored through the storage
abstraction — an admin-only upload endpoint, a CLI for attaching from disk, and a
visibility-checked download route (`verify:files`).

**Not yet built:**

- Cancelling a code on a device that neither reconnects nor updates. The signed
  list only takes effect when a build ships, so a phone that is offline *and*
  running an older build keeps honouring a code cancelled after it. Undo has the
  same edge, from the other side: the device store is monotonic, so an un-revoked
  code works on the next install but not on the phone that already learned about
  it. Undo is also unable to tell a revocation-refund from a genuine one on the
  server — both are `paymentStatus = 'refunded'` — so it can re-open an account
  that was refunded for a real chargeback. Reaching those devices would need some
  form of push.
- A real bundled model transfer for the native build. Provisioning genuinely
  probes the model host and detects an installed model; the transfer itself is
  still simulated (`src/lib/offline/local-model.ts`) when none is found.
- Actually delivering renewal reminders. The scan, the queue, the retries and the
  re-check-before-send are real and covered by `verify:reminders`; the send itself
  logs what it would have sent, because no email provider is configured in this
  project.
- An upload UI for resource files. The admin-only endpoint, the CLI and the
  teacher-facing download route all exist; the admin area the form belongs in does
  not (`src/app/admin/**` was removed).
- Real Paystack integration (deferred by design).
- A worker build step. `npm run worker` runs the TypeScript entry point through
  `tsx`, which is fine for development and a single-process deploy but is not a
  production job runner.

## Why `src/package.json` exists

It contains one line — `"type": "module"` — and nothing else. `@react-pdf/renderer`
depends on `@react-pdf/hyphenate`, whose export map declares **only** an `import`
condition. Node's CommonJS resolver cannot satisfy that, so the worker died at
startup with `ERR_PACKAGE_PATH_NOT_EXPORTED` while Next.js (which bundles `src`
itself and never consults `exports`) worked fine. Marking `src/**` as ESM makes
the runtime resolution match the bundler's. Do not delete it, and do not be
tempted to add `"type": "module"` to the root `package.json` — that would break
`postcss.config.js`, which uses `module.exports`.

## Layout rules (do not break these)

- **No route groups** — no parentheses folders anywhere under `src/app`.
- Middleware does role gating only. It must never touch the DB or check
  subscriptions; that happens in a Server Component layout
  (`src/app/dashboard/learn/layout.tsx`).
- Certificates and billing are gated by auth alone, so a teacher keeps access to
  certificates they already earned after a subscription lapses.
- AI access goes through `getAIProvider()` in `src/lib/ai/index.ts` only, so the
  provider stays swappable. The same rule applies to storage: go through
  `getStorageProvider()` in `src/lib/storage/index.ts`.
- Content status moves only through `src/lib/content/status.ts`. There is no
  code path from `draft` straight to `published`.
- **Nothing in the registration path may require the network.** The splash,
  device recognition, the wizard, activation codes and the term pass all run
  from `src/lib/offline` against encrypted localStorage. Server calls on that
  path are best-effort background syncs that are never awaited by the UI.
- **Class levels and subjects come from `src/lib/content/curriculum.ts`.** Never
  hardcode a subject list in a component — the level-tagged pools are what stop
  curriculum standards bleeding across levels, and the browse pages and the
  wizard are derived from the same source so they cannot disagree.
- **Auth.js needs `trustHost`.** It is set in *both* `src/lib/auth/config.ts` and
  `src/middleware.ts` (the middleware builds its own edge-safe instance and does
  not inherit it). Without it every auth route — including `/api/auth/csrf` —
  answers 500 with `UntrustedHost` under `next start` while working perfectly in
  `next dev`. If this ever goes behind untrusted proxy infrastructure, pin
  `AUTH_URL` to the canonical origin instead.
- **Server-side enforcement belongs in the route, not the client.** An offline
  device cannot know a code was redeemed elsewhere. `/api/subscriptions/sync`
  holds the unique reference per code and returns 409 on reuse; the client reacts
  by blocking the code and revoking the pass. Do not "simplify" that check away.
- **Revocation is monotonic on the device.** The revocation store is only ever
  merged into, never cleared, and a cancelled code is refused both when it is
  redeemed and when the app launches on a pass for it. Never add a path that
  un-revokes locally: the only correct direction is to stop honouring a code, and
  a device that re-accepts one after reconnecting is the bug that store exists to
  prevent.
#   t e a c h e r - r e s o u r c e - b a n k k  
 