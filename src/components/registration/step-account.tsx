"use client";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Step 1 — name and email.
 *
 * No password: registration completes on the device, and a server account is an
 * optional extra rather than a prerequisite. Validation stays light (a name, and
 * something that looks like an email) because none of this gates anything
 * offline.
 */
export function StepAccount({
  name,
  email,
  error,
  onNameChange,
  onEmailChange,
  onSubmit,
}: {
  name: string;
  email: string;
  error: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      {/* `noValidate` on purpose: with a `type="email"` input, the browser's own
          constraint validation fires first and blocks submit, so the message
          below never renders — the flow silently dead-ends on a native tooltip
          instead. Turning it off makes these messages authoritative and keeps the
          error wording identical across browsers. */}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => onNameChange(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            autoComplete="email"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </>
  );
}
