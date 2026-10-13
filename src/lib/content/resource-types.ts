/**
 * Resource type vocabulary.
 *
 * Kept separate from resources.service.ts on purpose: that module imports the
 * database client, and client components (the resource form) need these values.
 * Importing them from the service dragged `pg` into the browser bundle.
 *
 * Updated to include the PRD resource types: lesson_note, scheme_of_work, question_bank
 * alongside the original types for backwards compatibility.
 */

export const RESOURCE_TYPES = [
  "lesson_plan",
  "lesson_note",
  "scheme_of_work",
  "question_bank",
  "worksheet",
  "template",
  "other",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  lesson_plan: "Lesson plan",
  lesson_note: "Lesson note",
  scheme_of_work: "Scheme of work",
  question_bank: "Question bank",
  worksheet: "Worksheet",
  template: "Template",
  other: "Other",
};

/** Colour mappings for resource type badges (teacher-facing) */
export const RESOURCE_TYPE_COLOR: Record<ResourceType, string> = {
  lesson_plan: "bg-blue-50 text-blue-700",
  lesson_note: "bg-indigo-50 text-indigo-700",
  scheme_of_work: "bg-purple-50 text-purple-700",
  question_bank: "bg-amber-50 text-amber-700",
  worksheet: "bg-teal-50 text-teal-700",
  template: "bg-warm-100 text-warm-700",
  other: "bg-warm-100 text-warm-600",
};

/** Icon emoji for each resource type */
export const RESOURCE_TYPE_ICON: Record<ResourceType, string> = {
  lesson_plan: "📋",
  lesson_note: "📝",
  scheme_of_work: "📅",
  question_bank: "❓",
  worksheet: "📄",
  template: "📑",
  other: "📎",
};
