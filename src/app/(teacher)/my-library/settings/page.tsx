"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Badge } from "@/components/ui";
import {
  clearDeviceToken,
  clearTermPass,
  daysUntilExpiry,
  formatBytes,
  getModelState,
  getTeacherProfile,
  getTermPass,
  isModelReady,
  isTermPassActive,
  MODEL_SIZE_BYTES,
  type ModelState,
  provisionLocalModel,
  saveTeacherProfile,
  STORAGE_KEYS,
  type TeacherProfile,
} from "@/lib/offline";

export default function SettingsPage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [name, setName] = useState("");
  const [modelState, setModelState] = useState<ModelState>(getModelState());
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const termPass = getTermPass();
  const passActive = isTermPassActive();
  const daysLeft = daysUntilExpiry();

  useEffect(() => {
    const prof = getTeacherProfile();
    if (prof) {
      setProfile(prof);
      setName(prof.name);
    }

    const interval = setInterval(() => {
      setModelState(getModelState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const updated = { ...profile, name: name.trim() || profile.name };
    saveTeacherProfile(updated);
    setProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  }

  function handleStartDownload() {
    setIsDownloading(true);
    provisionLocalModel((state) => {
      setModelState(state);
      if (state.status === "ready" || state.status === "error") {
        setIsDownloading(false);
      }
    });
  }

  function handleSignOut() {
    clearDeviceToken();
    clearTermPass();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.deviceToken);
      window.localStorage.removeItem(STORAGE_KEYS.termPass);
      window.localStorage.removeItem(STORAGE_KEYS.teacherProfile);
    }
    window.location.href = "/sign-in";
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Settings</h1>
        <p className="mt-1 text-xs text-warm-500">Manage your profile, term pass, and on-device AI storage.</p>
      </div>

      {/* 1. Term Pass & Entitlement Card */}
      <Card>
        <CardBody className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-warm-500">Term Pass Status</p>
              <h2 className="mt-1 text-base font-bold text-ink">Nigerian Academic Term Pass</h2>
            </div>
            <Badge variant={passActive ? "active" : "neutral"}>
              {passActive ? "Active" : "Expired / Inactive"}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-warm-50 p-3 text-xs">
            <div>
              <p className="text-warm-400">Duration</p>
              <p className="font-semibold text-ink">3 Months Pass</p>
            </div>
            <div>
              <p className="text-warm-400">Time Remaining</p>
              <p className="font-semibold text-ink">
                {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days remaining` : "Expired"}
              </p>
            </div>
          </div>

          {termPass?.code && (
            <p className="mt-3 text-[11px] text-warm-400">
              Pass ID: <span className="font-mono text-ink">{termPass.code}</span>
            </p>
          )}
        </CardBody>
      </Card>

      {/* 2. On-Device AI Model Storage Card */}
      <Card>
        <CardBody className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-warm-500">On-Device AI Engine</p>
              <h2 className="mt-1 text-base font-bold text-ink">Offline Qwen Curriculum Model</h2>
            </div>
            <Badge variant={modelState.status === "ready" ? "published" : "active"}>
              {modelState.status === "ready"
                ? "Downloaded & Ready"
                : modelState.status === "downloading"
                ? "Downloading..."
                : modelState.status === "error"
                ? "Download Interrupted"
                : "Not Downloaded"}
            </Badge>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-warm-500">
              <span>{formatBytes(modelState.bytesDownloaded)} of {formatBytes(MODEL_SIZE_BYTES)}</span>
              <span>{modelState.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-warm-100">
              <div
                className="h-full rounded-full bg-ink transition-all duration-300"
                style={{ width: `${Math.max(4, modelState.progress)}%` }}
              />
            </div>
            {modelState.detail && (
              <p className="text-[11px] text-warm-500">{modelState.detail}</p>
            )}
          </div>

          {!isModelReady() && (
            <Button
              type="button"
              onClick={handleStartDownload}
              isLoading={isDownloading || modelState.status === "downloading"}
              className="mt-4 w-full text-xs font-semibold"
            >
              {modelState.status === "downloading" ? "Downloading in Background..." : "Download / Resume Model (491 MB)"}
            </Button>
          )}
        </CardBody>
      </Card>

      {/* 3. Teacher Profile Form */}
      {profile && (
        <Card>
          <CardBody className="p-5">
            <h2 className="text-sm font-bold text-ink">Teacher Profile</h2>
            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-warm-600">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-warm-300 bg-warm-50 px-3.5 py-2 text-sm text-ink focus:border-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-warm-600">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 w-full rounded-xl border border-warm-200 bg-warm-100/60 px-3.5 py-2 text-sm text-warm-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-warm-50 p-3">
                  <p className="text-warm-400">Class Levels</p>
                  <p className="font-semibold text-ink mt-0.5">{profile.classLevels.join(", ") || "None"}</p>
                </div>
                <div className="rounded-xl bg-warm-50 p-3">
                  <p className="text-warm-400">Registered Subjects</p>
                  <p className="font-semibold text-ink mt-0.5 truncate">{profile.subjects.join(", ") || "General"}</p>
                </div>
              </div>

              {saveSuccess && (
                <p className="text-xs font-medium text-emerald-600">Profile saved successfully!</p>
              )}

              <Button type="submit" size="sm">
                Save Changes
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* 4. Danger Zone / Sign Out */}
      <Card>
        <CardBody className="p-5 space-y-3">
          <h2 className="text-sm font-bold text-ink">Account & Device</h2>
          <p className="text-xs text-warm-500 leading-relaxed">
            Signing out will disconnect this device and return to the activation screen.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSignOut}
              className="text-xs font-medium text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              Sign out of this device
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
