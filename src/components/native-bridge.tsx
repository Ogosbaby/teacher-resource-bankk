"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native/app";

/**
 * Tells the stylesheet it is running inside the installed app.
 *
 * A WebView has no browser chrome and no home bar of its own, so two things the
 * web layout gets for free have to be handled here:
 *
 * 1. **Safe areas.** On a phone with a notch or a gesture bar, content under the
 *    status bar or the home indicator is unreachable. `viewport-fit=cover` (set in
 *    the root layout) plus `env(safe-area-inset-*)` fixes that — but only for the
 *    app, where the content is genuinely full-bleed. A desktop browser reports
 *    zero insets anyway, so the class exists mainly so the rules are explicit
 *    rather than accidental.
 *
 * 2. **A place to hang native-only behaviour.** Anything that must apply to the
 *    shell and nothing else keys off `html.native-app`, instead of scattering
 *    `Capacitor.isNativePlatform()` checks through components.
 *
 * Runs as an effect rather than during render because `window` does not exist
 * during server rendering, and the class has to be on `<html>` before the layout
 * paints to avoid a visible jump.
 */
export function NativeBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;

    document.documentElement.classList.add("native-app");

    return () => document.documentElement.classList.remove("native-app");
  }, []);

  return null;
}
