import { z } from "zod";
import { CONTENT_STATUSES } from "@/lib/content/status";
import { RESOURCE_TYPES } from "@/lib/content/resource-types";

/**
 * Request schemas shared by admin routes.
 *
 * These live here rather than in a route.ts file because Next.js requires route
 * modules to export only HTTP handlers — an extra export fails the build.
 */

export const moduleSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().nullable().optional(),
  contentType: z.enum(["video", "text", "quiz", "resource", "external_link"]).optional(),
  videoUrl: z.string().max(500).nullable().optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
});

export const coursePayloadSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().nullable().optional(),
  subject: z.string().max(100).nullable().optional(),
  classLevels: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
  coverImageUrl: z.string().max(500).nullable().optional(),
  modules: z.array(moduleSchema).optional(),
});

export const courseUpdateSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("update"),
    data: coursePayloadSchema.partial(),
  }),
  z.object({
    mode: z.literal("status"),
    status: z.enum(CONTENT_STATUSES),
  }),
]);

export const resourcePayloadSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  resourceType: z.enum(RESOURCE_TYPES),
  subject: z.string().max(100).nullable().optional(),
  gradeLevel: z.string().max(50).nullable().optional(),
  /** `/subjects/{level}/{class}/{subject}/{topic}` — the topic page a resource appears on. */
  topicPath: z.string().max(200).nullable().optional(),
  tags: z.array(z.string()).optional(),
  fileType: z.string().max(20).nullable().optional(),
  aiGenerated: z.boolean().optional(),
});

export const resourceUpdateSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("update"),
    data: resourcePayloadSchema.partial(),
  }),
  z.object({
    mode: z.literal("status"),
    status: z.enum(CONTENT_STATUSES),
  }),
]);
