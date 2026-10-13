"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The persistent activation bypass.
 *
 * Deliberately rendered *outside* the step transition, at the top of the card, so
 * it is reachable at every step — including mid-flow. A teacher who was handed a
 * code halfway through registration should not have to finish the wizard to use
 * it. Redeeming a code skips the remaining steps entirely.
 */
export function ActivationBypass({
  open,
  code,
  error,
  loading,
  onToggle,
  onCodeChange,
  onSubmit,
}: {
  open: boolean;
  code: string;
  error: string | null;
  loading: boolean;
  onToggle: () => void;
  onCodeChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <div className="flex justify-end px-6 pt-4">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-900"
        >
          {open ? "Close" : "Input Activation Code"}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden px-6"
          >
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <Label htmlFor="activation-bypass">Activation code</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="activation-bypass"
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  placeholder="TRB-XXXX-XXXX"
                  autoComplete="off"
                />
                <Button type="submit" className="shrink-0" isLoading={loading}>
                  Apply
                </Button>
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                Already have a code? Enter it now — it skips the rest of registration.
              </p>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}
