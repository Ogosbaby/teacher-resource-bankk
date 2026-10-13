/**
 * The single source of truth for content lifecycle transitions.
 *
 * Every piece of content (courses, modules, learning paths, resources, KB
 * articles) moves draft -> in_review -> published -> archived. There is
 * deliberately NO path from draft straight to published: publishing requires
 * passing through in_review first, so an AI draft can never reach teachers on
 * its own. Enforced here and re-checked server-side in every admin route.
 */

export const CONTENT_STATUSES = ["draft", "in_review", "published", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["in_review", "archived"],
  in_review: ["published", "draft"],
  published: ["archived"],
  // Restoring goes back to draft, not straight to published — an archived
  // resource has to be looked at again before it is live.
  archived: ["draft"],
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

/** Wording for the action that performs the transition, shown on admin buttons. */
export const TRANSITION_LABEL: Record<ContentStatus, string> = {
  draft: "Send back to draft",
  in_review: "Submit for review",
  published: "Publish",
  archived: "Archive",
};

export function allowedTransitions(from: ContentStatus): ContentStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return allowedTransitions(from).includes(to);
}

export function isContentStatus(value: unknown): value is ContentStatus {
  return typeof value === "string" && (CONTENT_STATUSES as readonly string[]).includes(value);
}

/** Thrown when a requested status change would bypass the review pipeline. */
export class InvalidTransitionError extends Error {
  constructor(
    readonly from: ContentStatus,
    readonly to: ContentStatus
  ) {
    super(`Cannot move content from "${from}" to "${to}".`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Audit fields to stamp alongside a status change. Publishing records who
 * reviewed it and when; moving back to draft/in_review clears that, because the
 * prior sign-off no longer applies to the edited content.
 */
export function reviewFieldsFor(
  to: ContentStatus,
  actorId: string
): { reviewedBy: string | null; reviewedAt: Date | null } {
  if (to === "published") {
    return { reviewedBy: actorId, reviewedAt: new Date() };
  }
  if (to === "in_review" || to === "draft") {
    return { reviewedBy: null, reviewedAt: null };
  }
  return { reviewedBy: null, reviewedAt: null };
}
