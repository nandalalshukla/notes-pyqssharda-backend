import { z } from "zod";

/**
 * Schema for liking/unliking content
 * Used in: like.ts controller
 */
export const likeActionSchema = z.object({
  targetId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid target ID format",
  }),
  targetType: z.enum(["post", "comment"]),
});

/**
 * Extracted params schema for like endpoints
 */
export const likeParamsSchema = z.object({
  likeId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid like ID format",
  }),
});

export type LikeActionInput = z.infer<typeof likeActionSchema>;
export type LikeParams = z.infer<typeof likeParamsSchema>;
