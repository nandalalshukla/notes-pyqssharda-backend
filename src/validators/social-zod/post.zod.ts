import { z } from "zod";

/**
 * Schema for creating a post
 * Used in: createPost controller
 * Note: Files are handled separately by multer, only content is validated here
 */
export const createPostSchema = z.object({
  content: z
    .string()
    .max(2000, "Post content cannot exceed 2000 characters")
    .optional()
    .refine(
      (value) => {
        // Either content or files must be provided (handled in controller)
        return value === undefined || typeof value === "string";
      },
      { message: "Content must be a string" },
    ),
});

/**
 * Schema for editing a post
 * Used in: editPost controller
 */
export const editPostSchema = z.object({
  content: z
    .string()
    .trim()
    .max(2000, "Post content cannot exceed 2000 characters")
    .optional(),
  removePublicIds: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      },
      { message: "removePublicIds must be a valid JSON array" },
    ),
});

/**
 * Extracted params schema for post endpoints
 */
export const postParamsSchema = z.object({
  postId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid post ID format",
  }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type EditPostInput = z.infer<typeof editPostSchema>;
export type PostParams = z.infer<typeof postParamsSchema>;
