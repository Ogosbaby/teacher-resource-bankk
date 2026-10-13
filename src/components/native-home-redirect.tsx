"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native/app";

/**
 * Keeps the installed app off the marketing landing page.
 *
 * The app's start URL is already the entry (`/app` — see `capacitor.config.ts`),
 * so this is the second line of defence: the landing page is linked from the nav,
 * a share sheet, a notification, or a teacher typing the domain, and any of those
 * inside the shell would drop them on a website front door with a pricing table
 * and a sign-up CTA — which is not what an app is.
 *
 * `replace` rather than `push`, so back does not return to the landing page and
 * bounce forward again in a loop.
 *
 * On the web this renders nothing and does nothing: `Capacitor` is only injected
 * by the native shell, so a browser never sees it.
 */
export function NativeHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isNativeApp()) router.replace("/app");
  }, [router]);

  return null;
}
