import { z } from "zod";
import { CONTENT_TYPES } from "../../controllers/admin-controllers/contentManagement.js";

/**
 * Validators for the admin content console.
 *
 * `contentTypeSchema` is derived from the controller's own resource map, so
 * a new resource type can't be accepted by the route while the controller
 * has no handler for it (or vice versa).
 */
export const contentTypeSchema = z.enum(
  CONTENT_TYPES as [string, ...string[]],
);

export const contentStatusSchema = z.enum([
  "all",
  "pending",
  "approved",
  "rejected",
]);

const objectId = z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
  message: "Invalid ID format",
});

/** GET /admin/content/:type */
export const listContentSchema = z.object({
  type: contentTypeSchema,
  status: contentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  query: z.string().trim().max(120).optional(),
  program: z.string().trim().max(120).optional(),
});

/** GET /admin/content/:type/counts */
export const contentCountsSchema = z.object({ type: contentTypeSchema });

/** PATCH /admin/content/:type/:id/approve and DELETE /admin/content/:type/:id */
export const contentActionSchema = z.object({
  type: contentTypeSchema,
  id: objectId,
});

/** PATCH /admin/content/:type/:id/reject */
export const rejectContentSchema = contentActionSchema.extend({
  rejectionReason: z
    .string()
    .trim()
    .min(5, { message: "Rejection reason must be at least 5 characters" })
    .max(500, { message: "Rejection reason must not exceed 500 characters" }),
});

export type ListContentInput = z.infer<typeof listContentSchema>;
export type RejectContentInput = z.infer<typeof rejectContentSchema>;
