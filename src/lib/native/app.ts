"use client";

import { useEffect, useState } from "react";

/**
 * Whether this page is running inside the installed app.
 *
 * `Capacitor` is injected by the native shell into the WebView and is simply
 * absent in a browser, so its presence is the detection. Shared rather than
 * repeated, because the checks used to be scattered one-off `window` casts that
 * had to agree with each other about a shape the compiler cannot see.
 *
 * Reading it during render is impossible — `window` does not exist on the server,
 * and rendering `/` then flipping to `/app` is how hydration mismatches are made.
 * The hook therefore starts `false` and corrects in an effect, which on the native
 * shell is a single frame.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  if (Boolean(cap?.isNativePlatform?.())) return true;
  if (window.location.pathname.startsWith("/app")) return true;
  if (typeof navigator !== "undefined" && /Capacitor|trb-android|wv/i.test(navigator.userAgent)) {
    return true;
  }
  try {
    if (window.localStorage.getItem("trb.is_native_app") === "true") return true;
  } catch {}
  return false;
}

export function useIsNativeApp(): boolean {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  return native;
}
