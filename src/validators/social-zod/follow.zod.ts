import { z } from "zod";

/**
 * Schema for following/unfollowing users
 * Used in: toggleFollow.ts controller
 * Validates URL parameter userId
 */
export const followActionSchema = z.object({
  userId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid user ID format",
  }),
});

/**
 * Schema for fetching followers/following with pagination
 */
export const followListSchema = z.object({
  userId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid user ID format",
  }),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .refine((val) => val > 0, { message: "Page must be greater than 0" }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20))
    .refine((val) => val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    }),
});

export type FollowActionInput = z.infer<typeof followActionSchema>;
export type FollowListInput = z.infer<typeof followListSchema>;
