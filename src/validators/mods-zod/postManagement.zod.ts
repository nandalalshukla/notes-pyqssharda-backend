import { z } from "zod";

/**
 * Schema for rejecting a pending post
 * Used in: rejectPost controller
 *
 * Mirrors rejectNoteSchema / rejectPYQSchema — the author is shown this
 * text verbatim, so it has to say something.
 */
export const rejectPostSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, { message: "Rejection reason must be at least 5 characters" })
    .max(500, { message: "Rejection reason must not exceed 500 characters" }),
});

/**
 * Extracted params schema for post moderation endpoints
 */
export const postModerationParamsSchema = z.object({
  postId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid post ID format",
  }),
});

export type RejectPostInput = z.infer<typeof rejectPostSchema>;
export type PostModerationParams = z.infer<typeof postModerationParamsSchema>;
