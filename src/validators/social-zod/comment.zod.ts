import { z } from "zod";

/**
 * Schema for creating a comment
 * Used in: createComment controller
 */
export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment must not exceed 1000 characters" }),
  postId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid post ID format",
  }),
});

/**
 * Schema for editing a comment
 * Used in: editComment controller
 */
export const editCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment must not exceed 1000 characters" }),
});

/**
 * Extracted params schema for comment endpoints
 */
export const commentParamsSchema = z.object({
  commentId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid comment ID format",
  }),
});

/**
 * Schema for fetching comments with pagination
 */
export const getCommentsSchema = z.object({
  postId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid post ID format",
  }),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .refine((val) => val > 0, { message: "Page must be greater than 0" }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10))
    .refine((val) => val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type EditCommentInput = z.infer<typeof editCommentSchema>;
export type CommentParams = z.infer<typeof commentParamsSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
