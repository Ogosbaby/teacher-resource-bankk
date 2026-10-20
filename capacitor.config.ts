import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell configuration.
 *
 * "Remote URL" mode: the app is a thin Capacitor shell that loads the real site,
 * so auth cookies, API routes and the database keep working with zero rewrite.
 *
 * Two deliberate choices:
 *
 * 1. **The URL points at `/app`, not `/`.** The app entry runs the splash and then
 *    does offline device recognition — recognised device to the app, unrecognised
 *    to registration. Loading `/` would show the marketing landing page instead,
 *    which is a website's front door, not an app's. The landing page still exists
 *    for the web; the installed app simply never opens on it.
 *
 * 2. **The host comes from the environment.** Hard-coding a domain here means
 *    every test build points at production, and a LAN test build has to edit this
 *    file — the kind of edit that gets committed by accident. So:
 *
 *      CAP_SERVER_URL=https://your-domain.example.com npx cap sync android
 *      CAP_SERVER_URL=http://192.168.1.20:3000     npx cap sync android   # LAN test
 *
 *    A localhost or private-range URL implies plaintext HTTP (http://), which
 *    Android blocks by default; `cleartext` is derived from the scheme rather than
 *    set by hand, so the two cannot disagree and produce an app that silently
 *    loads nothing.
 */
const target = process.env.CAP_SERVER_URL?.trim() || "https://teacher-resource-bankk.vercel.app";
const isSecure = target.startsWith("https://");

const config: CapacitorConfig = {
  appId: "com.teacherresourcebank.app",
  appName: "Teacher Resource Bank",
  webDir: "public",
  server: {
    url: `${target.replace(/\/+$/, "")}/app`,

    cleartext: !isSecure,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#111111",
  },
};

export default config;
