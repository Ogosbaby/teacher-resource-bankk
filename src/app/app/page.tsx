"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import {
  STORAGE_KEYS,
  isRecognisedDevice,
  getDeviceToken,
  getTeacherProfile,
  verifyAndRecordClockOpen,
} from "@/lib/offline";

/** Where a tampered device is locked. */
const CLOCK_TAMPER_PATH = "/tamper-lock";

/** Where a recognised device lands — the app's main surface. */
const RECOGNISED_DEVICE_HOME = "/courses";

/**
 * Resolve the route the app should navigate to after the splash screen.
 *
 * Three states:
 *   1. **Recognised device with valid token** → `/courses` (main app)
 *   2. **Returning user (has profile/deviceId but signed out)** → `/app/sign-in`
 *   3. **Brand-new device (never activated)** → `/app/activate`
 *
 * Clock tampering always overrides: → `/tamper-lock`
 */
function resolveInitialRoute(): string {
  const clock = verifyAndRecordClockOpen();
  if (clock.tampered) return CLOCK_TAMPER_PATH;

  // Device is fully recognised → straight to courses
  if (isRecognisedDevice()) return RECOGNISED_DEVICE_HOME;

  // Has a profile or device token (but expired / signed out) → sign in
  const token = getDeviceToken();
  const profile = getTeacherProfile();
  if (token || profile) return "/app/sign-in";

  // Completely new device → activation code input
  return "/app/activate";
}

/**
 * App entry point — the launch path for the installed app.
 *
 * Sequence:
 *   1. Show the splash immediately on cold start.
 *   2. Blink the logo three times.
 *   3. Run device recognition (offline).
 *   4. Route to the correct screen based on device state.
 *
 * The splash is shown once per session. On an in-session navigation to /app
 * they are routed straight through, because replaying a 3.5s animation on
 * every internal return would be hostile.
 */
export default function AppEntryPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);
  const navigated = useRef(false);

  const go = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace(resolveInitialRoute());
  }, [router]);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEYS.splashShown) === "1") {
      go();
      return;
    }
    setShowSplash(true);
  }, [go]);

  const handleComplete = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEYS.splashShown, "1");
    go();
  }, [go]);

  if (!showSplash) return <div className="min-h-screen bg-ink" />;

  return <SplashScreen caption="Opening your classroom" onComplete={handleComplete} />;
}
