import "./globals.css";
import type { Viewport } from "next";
import { Inter, JetBrains_Mono, Lexend } from "next/font/google";
import { NativeBridge } from "@/components/native-bridge";
import { SplashHandoff } from "@/components/splash-screen";
import { OfflineSyncBridge } from "@/components/offline-sync-bridge";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata = { title: "Teacher Resource Bank — CPD Courses for Nigerian Teachers" };

// `viewportFit: "cover"` lets the app draw under the status bar and the home
// indicator; the CSS in globals.css then pads its own content back inside the
// safe area. Without it Android letterboxes the WebView and the app looks like a
// browser tab rather than an app.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <NativeBridge />
        <SplashHandoff />
        <OfflineSyncBridge />
        {children}
      </body>
    </html>
  );
}
