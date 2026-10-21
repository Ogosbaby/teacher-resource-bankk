"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { POST_SIGNUP_SPLASH_KEY, RECOGNISED_DEVICE_HOME } from "@/components/splash-screen";
import { getSubjectsForLevels, type ClassLevel } from "@/lib/content/curriculum";
import { syncProfileToServer } from "@/lib/client/profile-sync";
import { isNativeApp } from "@/lib/native/app";
import {
  ACTIVATION_ERROR_MESSAGES,
  applyShippedRevocations,
  clearDraft,
  clearTermPassRevocation,
  DEFAULT_TERM_MONTHS,
  getDeviceId,
  getModelState,
  getTermPassRevocation,
  grantTermPass,
  loadDraft,
  MODEL_SIZE_BYTES,
  provisionLocalModel,
  reconcileSubjects,
  reconcileTermPassWithRevocations,
  redeemActivationCode,
  registerDevice,
  saveDraft,
  saveTeacherProfile,
  isEmailRegisteredLocally,
  recordRegisteredEmailLocally,
  syncTermPassWithServer,
  type ModelState,
  type TermPassRevocation,
} from "@/lib/offline";
import { sectionSubjects } from "./subject-sections";

export interface GrantedPass {
  code: string | null;
  months: number;
}

/**
 * All of the registration flow's state and behaviour.
 *
 * Split out of the page so the four steps are presentational and the offline
 * mechanics live in one reviewable place. The rules it enforces:
 *
 *  - Every change is persisted, so a refresh or a closed tab loses nothing.
 *  - Step 3's pool is always derived from Step 2's selection, and deselecting a
 *    level drops the subjects that belonged to it.
 *  - There is exactly one unlock path (`unlock`), shared by the activation bypass
 *    and the demo step, so the two can never diverge in what they grant.
 */
export function useRegistration() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailConflict, setEmailConflict] = useState<string | null>(null);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);

  const [finishing, setFinishing] = useState(false);
  const [granted, setGranted] = useState<GrantedPass | null>(null);
  const [modelState, setModelState] = useState<ModelState>({
    status: "idle",
    progress: 0,
    bytesDownloaded: 0,
    totalBytes: MODEL_SIZE_BYTES,
    updatedAt: 0,
  });

  // Activation bypass — reachable at every step.
  const [bypassOpen, setBypassOpen] = useState(false);
  const [bypassCode, setBypassCode] = useState("");
  const [bypassError, setBypassError] = useState<string | null>(null);
  const [bypassLoading, setBypassLoading] = useState(false);

  // A revoke this device can't see coming: the server removes the pass, and the
  // teacher lands back here with no idea why. Only a recorded reason can explain it.
  const [revocation, setRevocation] = useState<TermPassRevocation | null>(null);

  const cancelProvisioning = useRef<null | (() => void)>(null);

  // ── Restore an in-progress registration ──────────────────
  // Runs once on mount, client-side only, so the markup renders identically on
  // the server and there is no hydration mismatch.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setName(draft.name);
      setEmail(draft.email);
      setClassLevels(draft.classLevels);
      setSubjects(draft.subjects);
      setStep(draft.step);
    }
    setRevocation(getTermPassRevocation());
    setModelState(getModelState());
    setHydrated(true);

    // A code revoked while this device was offline only becomes visible once the
    // shipped list has been verified, and that verification is async. So the
    // notice is re-read after it, rather than only on the synchronous first pass —
    // otherwise a teacher landing here straight from a revocation would just see
    // an empty wizard with no explanation.
    void applyShippedRevocations().then(() => {
      reconcileTermPassWithRevocations();
      setRevocation(getTermPassRevocation());
    });
  }, []);

  useEffect(() => () => cancelProvisioning.current?.(), []);

  // ── Persist every change, so a refresh loses nothing ─────
  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ step, name, email, classLevels, subjects });
  }, [hydrated, step, name, email, classLevels, subjects]);

  const availableSubjects = useMemo(() => getSubjectsForLevels(classLevels), [classLevels]);
  const sections = useMemo(
    () => sectionSubjects(availableSubjects, classLevels),
    [availableSubjects, classLevels]
  );

  /**
   * Deselecting a level must also drop any subjects that belonged only to that
   * level, or Step 3 would carry a stale selection no longer present in the list.
   */
  const toggleClassLevel = useCallback((level: ClassLevel) => {
    setError(null);
    setClassLevels((prev) => {
      const next = prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level];
      setSubjects((current) => reconcileSubjects(next, current));
      return next;
    });
  }, []);

  const toggleSubject = useCallback((id: string) => {
    setError(null);
    setSubjects((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }, []);

  const toggleBypass = useCallback(() => {
    setBypassError(null);
    setBypassOpen((open) => !open);
  }, []);

  /**
   * The single unlock path, used by both the bypass and Step 4. Grants the
   * encrypted term pass, binds the device, starts provisioning, and marks the
   * draft complete.
   */
  const unlock = useCallback(
    (code: string | null, months: number) => {
      const pass = grantTermPass(code ?? "demo-pass", months);
      registerDevice(code ?? undefined);
      saveTeacherProfile({ name, email, classLevels, subjects });

      // Device binding log — the mock hardware UUID paired with the code.
      console.info("[trb] device bound", {
        deviceId: getDeviceId(),
        activationCode: code,
        expiresAt: pass.expiresAt,
      });

      clearDraft();
      // A fresh, successful activation supersedes any previous revocation notice.
      clearTermPassRevocation();
      setRevocation(null);
      setGranted({ code, months });
      setBypassOpen(false);

      // Non-blocking: the teacher is never held on the model. This probes the
      // model host first, so an already-installed local model resolves instantly
      // instead of animating a transfer that isn't happening.
      cancelProvisioning.current = provisionLocalModel(setModelState);

      // Server-optional background syncs. Neither is awaited, and neither can
      // fail the registration — the device is already unlocked.
      void syncTermPassWithServer();
      void syncProfileToServer({ name, classLevels, subjects });
    },
    [name, classLevels, subjects]
  );

  const handleBypassSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBypassError(null);
      setBypassLoading(true);

      // The signature check runs on WebCrypto, so redemption is async.
      const result = await redeemActivationCode(bypassCode);
      setBypassLoading(false);

      if (!result.ok) {
        setBypassError(ACTIVATION_ERROR_MESSAGES[result.reason ?? "unknown"]);
        return;
      }

      // If on the web, direct user to APK download page
      if (!isNativeApp()) {
        router.push("/payment-success?status=activated");
        return;
      }

      unlock(result.code ?? null, result.months ?? DEFAULT_TERM_MONTHS);
    },
    [bypassCode, router, unlock]
  );

  const handleStep1Continue = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setEmailConflict(null);

      const trimmedName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!trimmedName) return setError("Your name is required.");
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError("Enter a valid email address.");

      // 1. Immediate offline check: Was this email registered previously on this device?
      if (isEmailRegisteredLocally(cleanEmail)) {
        const msg =
          "This email address is already registered on this device. Please sign in instead.";
        setEmailConflict(msg);
        setError(msg);
        return;
      }

      setCheckingEmail(true);
      try {
        const res = await fetch("/api/onboarding/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.exists) {
            const msg =
              data.message ||
              "This email address is already registered in our system. Please sign in instead.";
            setEmailConflict(msg);
            setError(msg);
            setCheckingEmail(false);
            return;
          }
        }
      } catch (err) {
        console.warn("[registration] Online email check skipped (offline/network error):", err);
      } finally {
        setCheckingEmail(false);
      }

      setStep(2);
    },
    [name, email]
  );

  const handleStep2Continue = useCallback(() => {
    setError(null);
    if (classLevels.length === 0) return setError("Select at least one class level.");
    setStep(3);
  }, [classLevels]);

  const handleStep3Continue = useCallback(() => {
    setError(null);
    if (subjects.length === 0) return setError("Select at least one subject.");
    setStep(4);
  }, [subjects]);

  const handleFinish = useCallback((code?: string) => {
    setError(null);
    setFinishing(true);
    unlock(code ?? null, DEFAULT_TERM_MONTHS);
    setFinishing(false);
  }, [unlock]);

  const goToApp = useCallback(() => {
    if (!isNativeApp()) {
      router.push(`/payment-success?status=activated&name=${encodeURIComponent(name)}`);
      return;
    }
    sessionStorage.setItem(POST_SIGNUP_SPLASH_KEY, "1");
    router.push(RECOGNISED_DEVICE_HOME);
    router.refresh();
  }, [router, granted, name]);

  const handleEmailChange = useCallback((val: string) => {
    setEmail(val);
    setEmailConflict(null);
    setError(null);
  }, []);

  return {
    step,
    setStep,
    error,
    setError,
    name,
    setName,
    email,
    setEmail: handleEmailChange,
    phone,
    setPhone,
    checkingEmail,
    emailConflict,
    classLevels,
    subjects,
    finishing,
    granted,
    modelState,
    revocation,
    bypassOpen,
    bypassCode,
    setBypassCode,
    bypassError,
    bypassLoading,
    toggleBypass,
    availableSubjects,
    sections,
    toggleClassLevel,
    toggleSubject,
    handleBypassSubmit,
    handleStep1Continue,
    handleStep2Continue,
    handleStep3Continue,
    handleFinish,
    goToApp,
  };
}
