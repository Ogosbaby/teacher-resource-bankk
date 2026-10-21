"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logomark } from "@/components/brand/logomark";
import { Card, CardBody } from "@/components/ui";
import { ActivationBypass } from "@/components/registration/activation-bypass";
import { StepAccount } from "@/components/registration/step-account";
import { StepActivate } from "@/components/registration/step-activate";
import { StepClassLevels } from "@/components/registration/step-class-levels";
import { StepSubjects } from "@/components/registration/step-subjects";
import { SuccessPanel } from "@/components/registration/success-panel";
import { RegistrationSteps, StepHeading, StepTransition } from "@/components/registration/primitives";
import { useRegistration } from "@/components/registration/use-registration";
import { isNativeApp } from "@/lib/native/app";

/**
 * Offline-first registration wizard.
 *
 * This file is only the composition: it wires the shell (card, bypass, progress,
 * heading) to the four step components and the `useRegistration` hook. All the
 * offline mechanics — encrypted draft persistence, level-filtered subjects,
 * activation redemption, device binding and provisioning — live in the hook and
 * in `@/lib/offline`.
 *
 * Registration needs no network. The only server calls are background
 * best-efforts fired after the device is already unlocked.
 *
 * NOTE: Registration is BLOCKED in the native app. Teachers must register
 * on the website, pay, and receive an activation code. The app only accepts
 * activation codes — it does not allow new account creation.
 */
export default function SignUpWizardPage() {
  const router = useRouter();
  const r = useRegistration();

  // Native app users cannot register — redirect to activation screen
  useEffect(() => {
    if (isNativeApp()) {
      router.replace("/app/activate");
    }
  }, [router]);

  if (r.granted) {
    return <SuccessPanel granted={r.granted} modelState={r.modelState} teacherName={r.name} onContinue={r.goToApp} />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-warm-50/50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg rounded-3xl border border-warm-200 bg-white p-6 shadow-warm-lg sm:p-8">
        {/* Brand header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white group-hover:scale-105 transition-transform shadow-xs">
              <Logomark size={24} animated={false} />
            </div>
            <span className="text-sm font-bold tracking-tight text-ink">
              Teacher Resource Bank
            </span>
          </Link>
        </div>

        {r.revocation && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="text-xs font-semibold text-amber-900">Your previous pass was removed</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">{r.revocation.reason}</p>
          </div>
        )}

        <RegistrationSteps step={r.step} />
        <StepHeading step={r.step} />

        <StepTransition stepKey={r.step}>
          {r.step === 1 && (
            <StepAccount
              name={r.name}
              email={r.email}
              phone={r.phone}
              error={r.error}
              checkingEmail={r.checkingEmail}
              emailConflict={r.emailConflict}
              onNameChange={r.setName}
              onEmailChange={r.setEmail}
              onPhoneChange={r.setPhone}
              onSubmit={r.handleStep1Continue}
            />
          )}

          {r.step === 2 && (
            <StepClassLevels
              classLevels={r.classLevels}
              error={r.error}
              onToggle={r.toggleClassLevel}
              onBack={() => r.setStep(1)}
              onContinue={r.handleStep2Continue}
            />
          )}

          {r.step === 3 && (
            <StepSubjects
              sections={r.sections}
              totalCount={r.availableSubjects.length}
              classLevels={r.classLevels}
              selected={r.subjects}
              error={r.error}
              onToggle={r.toggleSubject}
              onBack={() => r.setStep(2)}
              onContinue={r.handleStep3Continue}
            />
          )}

          {r.step === 4 && (
            <StepActivate
              name={r.name}
              email={r.email}
              phone={r.phone}
              classLevels={r.classLevels}
              subjects={r.subjects}
              error={r.error}
              finishing={r.finishing}
              onBack={() => r.setStep(3)}
              onFinish={r.handleFinish}
            />
          )}
        </StepTransition>

        <div className="mt-6 border-t border-warm-100 pt-4 text-center">
          <p className="text-xs text-warm-500">
            Already have an active account or code?{" "}
            <Link href="/sign-in" className="font-semibold text-ink underline hover:text-neutral-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
