"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import {
  CLASS_LEVELS,
  getSubjectsForLevels,
  type ClassLevel,
} from "@/lib/content/curriculum";

/**
 * Profile editor.
 *
 * Class levels and subjects come from `@/lib/content/curriculum` — the same
 * source the registration wizard uses — so a teacher picks from exactly the same
 * pool here as they did at sign-up. Subjects are stored as level-tagged ids
 * (`primary_mathematics`), not labels, which is what lets a subject be traced
 * back to the level it was chosen for.
 */
export function ProfileForm({
  initialName,
  email,
  initialClassLevels,
  initialSubjects,
}: {
  initialName: string;
  email: string;
  initialClassLevels: string[];
  initialSubjects: string[];
}) {
  const [name, setName] = useState(initialName);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>(
    initialClassLevels.filter((l): l is ClassLevel => (CLASS_LEVELS as string[]).includes(l))
  );
  const [subjects, setSubjects] = useState<string[]>(initialSubjects);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const availableSubjects = useMemo(() => getSubjectsForLevels(classLevels), [classLevels]);
  const allowedIds = useMemo(() => new Set(availableSubjects.map((s) => s.id)), [availableSubjects]);

  function toggleLevel(level: ClassLevel) {
    setStatus("idle");
    setClassLevels((prev) => {
      const next = prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level];
      // Drop subjects that no longer belong to a selected level.
      const allowed = new Set(getSubjectsForLevels(next).map((s) => s.id));
      setSubjects((current) => current.filter((id) => allowed.has(id)));
      return next;
    });
  }

  function toggleSubject(id: string) {
    setStatus("idle");
    setSubjects((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, classLevels, subjects }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not save your profile.");
      setStatus("error");
      return;
    }
    setStatus("saved");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <Label>Email</Label>
        <Input value={email} disabled />
        <p className="mt-1.5 text-xs text-neutral-500">
          Email changes aren&apos;t supported yet — it identifies your account.
        </p>
      </div>

      <div>
        <Label>Class levels you teach</Label>
        <div className="flex flex-wrap gap-2">
          {CLASS_LEVELS.map((lvl) => (
            <Pill
              key={lvl}
              label={lvl}
              active={classLevels.includes(lvl)}
              onClick={() => toggleLevel(lvl)}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>Subjects you teach</Label>
        {availableSubjects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-white p-4 text-sm text-neutral-400">
            Pick a class level above and your subjects will appear here.
          </p>
        ) : (
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-3">
            {availableSubjects.map((subj) => (
              <Pill
                key={subj.id}
                label={subj.label}
                active={subjects.includes(subj.id)}
                onClick={() => toggleSubject(subj.id)}
                disabled={!allowedIds.has(subj.id)}
              />
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-4">
        <Button type="submit" isLoading={status === "saving"}>
          Save changes
        </Button>
        {status === "saved" && (
          <span className="text-sm font-medium text-emerald-700">Profile saved.</span>
        )}
      </div>
    </form>
  );
}

function Pill({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
        active
          ? "border-ink bg-ink text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
      )}
    >
      {label}
    </button>
  );
}
