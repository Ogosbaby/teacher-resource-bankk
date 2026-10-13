"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <Card className="relative w-full max-w-lg overflow-hidden">
        {/* Outside the step transition, so it is available at every step. */}
        <ActivationBypass
          open={r.bypassOpen}
          code={r.bypassCode}
          error={r.bypassError}
          loading={r.bypassLoading}
          onToggle={r.toggleBypass}
          onCodeChange={r.setBypassCode}
          onSubmit={r.handleBypassSubmit}
        />

        <CardBody>
          {r.revocation && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Your previous pass was removed</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">{r.revocation.reason}</p>
            </div>
          )}

          <RegistrationSteps step={r.step} />
          <StepHeading step={r.step} />

          <StepTransition stepKey={r.step}>
            {r.step === 1 && (
              <StepAccount
                name={r.name}
                email={r.email}
                error={r.error}
                onNameChange={r.setName}
                onEmailChange={r.setEmail}
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
                email={r.email}
                error={r.error}
                finishing={r.finishing}
                onBack={() => r.setStep(3)}
                onFinish={r.handleFinish}
              />
            )}
          </StepTransition>
        </CardBody>
      </Card>
    </div>
  );
}
