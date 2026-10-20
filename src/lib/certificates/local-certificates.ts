/**
 * Offline & Local Certificate Registry.
 *
 * Automatically records verifiable completion certificates directly on the device
 * when any course (preloaded or AI-generated) is completed.
 * Ensures the teacher unlocks and sees their certificate immediately, even without internet.
 */

import { getTeacherProfile, loadDraft } from "@/lib/offline";

export interface LocalCertificate {
  id: string;
  courseId: string;
  titleSnapshot: string;
  recipientNameSnapshot: string;
  completionDate: string;
  issuedAt: string;
  isOfflineIssued: boolean;
}

const STORAGE_KEY = "trb.local_certificates";

export function issueLocalCertificate(courseId: string, courseTitle: string): LocalCertificate {
  const profile = getTeacherProfile() || loadDraft();
  const recipientName = profile?.name || "Educator";
  const now = new Date().toISOString();

  const cert: LocalCertificate = {
    id: `cert-local-${courseId}-${Date.now()}`,
    courseId,
    titleSnapshot: courseTitle,
    recipientNameSnapshot: recipientName,
    completionDate: now,
    issuedAt: now,
    isOfflineIssued: true,
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getLocalCertificates();
      // Don't duplicate for same course
      const filtered = existing.filter((c) => c.courseId !== courseId);
      filtered.unshift(cert);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("Could not write certificate to local storage:", e);
    }
  }

  return cert;
}

export function getLocalCertificates(): LocalCertificate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
