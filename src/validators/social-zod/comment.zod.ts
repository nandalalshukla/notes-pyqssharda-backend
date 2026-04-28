import { z } from "zod";

/**
 * Schema for creating a comment
 * Used in: createComment controller
 * Note: Accepts both 'text' and 'content' for frontend compatibility
 */
export const createCommentSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, { message: "Comment cannot be empty" })
      .max(1000, { message: "Comment must not exceed 1000 characters" })
      .optional(),
    content: z
      .string()
      .trim()
      .min(1, { message: "Comment cannot be empty" })
      .max(1000, { message: "Comment must not exceed 1000 characters" })
      .optional(),
    parentComment: z.string().optional(),
  })
  .refine((data) => data.text || data.content, {
    message: "Either 'text' or 'content' field is required",
    path: ["text"],
  });

/**
 * Schema for editing a comment
 * Used in: editComment controller
 * Note: Accepts both 'text' and 'content' for frontend compatibility
 */
export const editCommentSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, { message: "Comment cannot be empty" })
      .max(1000, { message: "Comment must not exceed 1000 characters" })
      .optional(),
    content: z
      .string()
      .trim()
      .min(1, { message: "Comment cannot be empty" })
      .max(1000, { message: "Comment must not exceed 1000 characters" })
      .optional(),
  })
  .refine((data) => data.text || data.content, {
    message: "Either 'text' or 'content' field is required",
    path: ["text"],
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
