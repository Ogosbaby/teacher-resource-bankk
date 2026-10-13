"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { Button, Card, CardBody } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logomark } from "@/components/brand/logomark";
import {
  ACTIVATION_ERROR_MESSAGES,
  clearDraft,
  clearTermPassRevocation,
  DEFAULT_TERM_MONTHS,
  grantTermPass,
  isValidCodeFormat,
  provisionLocalModel,
  redeemActivationCode,
  registerDevice,
  syncTermPassWithServer,
} from "@/lib/offline";

import { isNativeApp } from "@/lib/native/app";

export default function SignInPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"code" | "email">("code");

  // Native app users should use the app-specific sign-in screen
  useEffect(() => {
    if (isNativeApp()) {
      router.replace("/app/sign-in");
    }
  }, [router]);

  // Code sign-in state
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  // Email sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    const cleaned = code.trim().toUpperCase();

    if (!isValidCodeFormat(cleaned)) {
      setCodeError("Enter a valid activation code formatted as TRB-XXXX-XXXX.");
      return;
    }

    setCodeLoading(true);
    try {
      const result = await redeemActivationCode(cleaned);
      if (!result.ok) {
        setCodeLoading(false);
        setCodeError(ACTIVATION_ERROR_MESSAGES[result.reason ?? "unknown"]);
        return;
      }

      // If user inputs activation code on the web, she is directed to the APK download page
      if (!isNativeApp()) {
        setCodeLoading(false);
        router.push("/payment-success?status=activated");
        return;
      }

      // Unlock device pass on native Android app
      grantTermPass(result.code ?? cleaned, result.months ?? DEFAULT_TERM_MONTHS);
      registerDevice(result.code ?? cleaned);
      clearDraft();
      clearTermPassRevocation();

      // Trigger model download and background sync
      provisionLocalModel();
      void syncTermPassWithServer();

      router.push("/courses");
      router.refresh();
    } catch (err) {
      setCodeLoading(false);
      setCodeError((err as Error).message || "Could not verify activation code.");
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setEmailLoading(false);
      setEmailError("Invalid email or password.");
      return;
    }

    const session = await getSession();
    setEmailLoading(false);
    if (session?.user?.role === "admin" || session?.user?.role === "sales_agent") {
      router.push("/dashboard");
    } else {
      if (!isNativeApp()) {
        router.push("/payment-success");
      } else {
        router.push("/courses");
      }
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50/60 px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden border border-warm-200 bg-white shadow-warm-lg">
        <CardBody className="p-6 sm:p-8">
          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white mb-3">
              <Logomark size={28} animated={false} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink">Sign in to TRB</h1>
            <p className="mt-1 text-xs text-warm-500">
              Input your activation code to unlock courses and resources on this device.
            </p>
          </div>

          {/* Tab selector */}
          <div className="mb-6 flex rounded-xl bg-warm-100 p-1">
            <button
              type="button"
              onClick={() => setTab("code")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                tab === "code"
                  ? "bg-white text-ink shadow-sm"
                  : "text-warm-600 hover:text-ink"
              }`}
            >
              Activation Code
            </button>
            <button
              type="button"
              onClick={() => setTab("email")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                tab === "email"
                  ? "bg-white text-ink shadow-sm"
                  : "text-warm-600 hover:text-ink"
              }`}
            >
              Email & Password
            </button>
          </div>

          {tab === "code" ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <Label htmlFor="activation-code" className="text-xs font-semibold text-ink">
                  Enter Activation Code
                </Label>
                <Input
                  id="activation-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TRB-XXXX-XXXX"
                  className="mt-1.5 font-mono text-center tracking-widest uppercase text-base"
                  required
                  autoFocus
                />
                <p className="mt-1.5 text-[11px] text-warm-500">
                  Formatted as TRB-XXXX-XXXX (from your card or receipt).
                </p>
              </div>

              {codeError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 leading-relaxed">
                  {codeError}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-semibold" isLoading={codeLoading}>
                Activate Device & Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              {emailError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 leading-relaxed">
                  {emailError}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-semibold" isLoading={emailLoading}>
                Sign In
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-warm-100 pt-4 text-center">
            <p className="text-xs text-warm-500">
              Don&apos;t have an account or code yet?{" "}
              <Link href="/sign-up" className="font-semibold text-ink underline">
                Get started
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
