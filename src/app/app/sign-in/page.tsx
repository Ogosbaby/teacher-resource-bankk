"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Card, CardBody, Button } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logomark } from "@/components/brand/logomark";
import {
  registerDevice,
  getDeviceToken,
  getDeviceId,
} from "@/lib/offline";

/**
 * Native app sign-in screen — shown to returning users whose device is
 * recognised (has a profile / expired token) but whose session has ended.
 *
 * Only email + password. No registration, no activation code (those happen
 * elsewhere). The teacher registered on the website and already activated
 * this device once; now they just need to prove they're the same person.
 *
 * Device binding check: if the signed-in user's device UUID doesn't match
 * the stored device token, they're told to contact support — preventing
 * account sharing across devices.
 */
export default function AppSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // Verify device binding — the same device that activated
    const token = getDeviceToken();
    const currentDeviceId = getDeviceId();
    if (token && token.deviceId !== currentDeviceId) {
      setLoading(false);
      setError(
        "This account was activated on a different device. Please contact support to transfer your license."
      );
      return;
    }

    // Re-register the device if the token expired (same device, re-auth)
    if (token && token.boundActivationCode) {
      registerDevice(token.boundActivationCode);
    }

    const session = await getSession();
    setLoading(false);

    // Admin / sales → dashboard (unlikely on native, but safe)
    if (session?.user?.role === "admin" || session?.user?.role === "sales_agent") {
      router.replace("/dashboard");
    } else {
      router.replace("/courses");
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden border-0 bg-white shadow-2xl">
        <CardBody className="p-6 sm:p-8">
          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white mb-4">
              <Logomark size={32} animated={false} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Welcome Back
            </h1>
            <p className="mt-2 text-xs text-warm-500 leading-relaxed">
              Sign in with the email and password you used during registration.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold text-ink">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 h-11"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold text-ink">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 h-11"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 leading-relaxed">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-sm font-semibold"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>

          {/* Device change help */}
          <div className="mt-6 border-t border-warm-100 pt-4 text-center">
            <p className="text-[11px] text-warm-400 leading-relaxed">
              Changed devices? Contact support to transfer your license.
            </p>
            <a
              href="https://wa.me/2349019006204?text=Hi%2C%20I%20changed%20devices%20and%20need%20to%20transfer%20my%20TRB%20license."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 transition-colors"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              Contact via WhatsApp
            </a>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
