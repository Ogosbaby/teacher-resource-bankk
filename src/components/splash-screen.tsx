"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Logomark } from "@/components/brand/logomark";
import { STORAGE_KEYS, isRecognisedDevice, verifyAndRecordClockOpen } from "@/lib/offline";

/**
 * Set this immediately before navigating a freshly-registered user onward. The
 * handoff splash consumes (and clears) it, so it fires exactly once.
 */
export const POST_SIGNUP_SPLASH_KEY = STORAGE_KEYS.postSignupSplash;

/** Where a tampered device is locked. */
export const CLOCK_TAMPER_PATH = "/tamper-lock";

/** Where a recognised device lands — the app's main surface. */
export const RECOGNISED_DEVICE_HOME = "/courses";

/** Where an unrecognised device is sent to input their activation code. */
export const REGISTRATION_PATH = "/app/activate";

/** The logo blinks exactly this many times. */
export const BLINK_COUNT = 3;

/** One full on→off cycle. Deliberately slow: the blink is meant to be seen. */
const BLINK_MS = 1150;

/** Total time the splash owns the screen before completion is forced. */
export const SPLASH_DURATION_MS = BLINK_COUNT * BLINK_MS;

/** `[0, 1, 0, 1, 0, 1, 0]` for 3 blinks — starts and ends dark. */
function blinkKeyframes(count: number): number[] {
  const frames = [0];
  for (let i = 0; i < count; i++) frames.push(1, 0);
  return frames;
}

/**
 * Presentational splash. Blinks the logomark `BLINK_COUNT` times at a slow,
 * perceptible pace and then calls `onComplete`.
 *
 * The completion timer is a hard `setTimeout` rather than an animation
 * `onAnimationComplete` callback. An exit-animation callback previously got
 * stuck and left this overlay permanently on screen at z-[100]; a timer cannot
 * fail that way.
 *
 * The caption deliberately does NOT blink — it is the persistent loading state
 * that stays readable for the whole cycle.
 */
export function SplashScreen({
  onComplete,
  caption = "Getting things ready",
}: {
  onComplete?: () => void;
  caption?: string;
}) {
  useEffect(() => {
    if (!onComplete) return;
    const timer = window.setTimeout(onComplete, SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
    // `onComplete` is intentionally excluded: re-arming on every render would
    // reset the blink from the start. The duration is fixed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-ink">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: blinkKeyframes(BLINK_COUNT) }}
        transition={{ duration: SPLASH_DURATION_MS / 1000, ease: "easeInOut" }}
      >
        <Logomark size={80} />
      </motion.div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">
          {caption}
        </p>
        {/* Persistent, non-blocking progress hint — no interaction required. */}
        <span className="h-1 w-24 overflow-hidden rounded-full bg-neutral-800">
          <motion.span
            className="block h-full w-1/3 rounded-full bg-neutral-500"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </div>
    </div>
  );
}

/**
 * Device recognition & integrity, run after the blink completes on app initialisation.
 *
 * Offline by construction: reads validated device token and checks clock integrity
 * from encrypted localStorage. No network call decides where the teacher goes.
 */
export function resolveInitialRoute(): string {
  const clock = verifyAndRecordClockOpen();
  if (clock.tampered) return CLOCK_TAMPER_PATH;
  return isRecognisedDevice() ? RECOGNISED_DEVICE_HOME : REGISTRATION_PATH;
}

/**
 * Post-registration handoff overlay, mounted once in the root layout.
 *
 * Two implementation details that matter, both learned the hard way:
 *
 * 1. The "should I show?" decision and the "unmount me" timer live in separate
 *    effects. Next.js enables React Strict Mode in development, which invokes
 *    each effect twice (mount, cleanup, mount). If the timer were armed in the
 *    same effect that clears the flag, the second invocation would see the flag
 *    already gone and return early — cancelling the only timer that ever
 *    unmounts this overlay, and stranding a full-screen layer at z-[100] on top
 *    of the entire app.
 *
 * 2. It re-checks on every pathname change, because the root layout does not
 *    remount during client-side navigation. Without this, setting the flag and
 *    calling router.push() would never trigger the splash.
 */
export function SplashHandoff() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(POST_SIGNUP_SPLASH_KEY) !== "1") return;
    sessionStorage.removeItem(POST_SIGNUP_SPLASH_KEY);
    setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  return <SplashScreen caption="Setting up your classroom" onComplete={() => setVisible(false)} />;
}
