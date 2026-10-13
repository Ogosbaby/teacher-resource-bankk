"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardBody, Button } from "@/components/ui";
import {
  getClockTamperDetails,
  resolveClockTamper,
  verifyAndRecordClockOpen,
  isRecognisedDevice,
  type ClockTamperState,
} from "@/lib/offline";

export default function ClockTamperLockPage() {
  const router = useRouter();
  const [details, setDetails] = useState<ClockTamperState | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const status = getClockTamperDetails();
    setDetails(status);
  }, []);

  async function handleCheckIn() {
    setChecking(true);
    setError(null);

    try {
      // Best-effort server time check
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const dateHeader = res.headers.get("Date");
      const serverTime = dateHeader ? new Date(dateHeader).getTime() : Date.now();

      // Resolve tamper state with the authoritative time
      resolveClockTamper(serverTime);

      const recheck = verifyAndRecordClockOpen();
      if (recheck.tampered) {
        setError("Your device clock is still out of sync. Please ensure automatic date & time is turned ON in device settings.");
        setChecking(false);
        return;
      }

      // Restored! Route back to app or registration
      if (isRecognisedDevice()) {
        router.replace("/courses");
      } else {
        router.replace("/sign-up");
      }
    } catch {
      setError("Could not reach the validation server. Please connect to the internet to verify your device time.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4 py-12 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="border-red-900/50 bg-neutral-950 text-neutral-100 shadow-2xl">
          <CardBody className="p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-950/80 text-red-500 border border-red-800/40">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Clock Manipulation Block
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              Your device&apos;s system clock reads an earlier time than your last recorded app session.
              To preserve offline subscription integrity, access is temporarily locked until your device clock is restored.
            </p>

            {details?.lastOpenedTimestamp && (
              <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3.5 text-left text-xs space-y-1">
                <div className="flex justify-between text-neutral-400">
                  <span>Last recorded session:</span>
                  <span className="font-mono text-neutral-200">
                    {new Date(details.lastOpenedTimestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Current device time:</span>
                  <span className="font-mono text-red-400">
                    {new Date(details.systemTimestamp ?? Date.now()).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-red-950/60 border border-red-900/80 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                variant="primary"
                className="w-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950"
                onClick={handleCheckIn}
                isLoading={checking}
              >
                Verify Online & Restore Access
              </Button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-xs text-neutral-400 hover:text-white py-1 transition-colors"
              >
                I&apos;ve updated my clock settings (Recheck)
              </button>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
