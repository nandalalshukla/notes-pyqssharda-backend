import { z } from "zod";

/**
 * Schema for reviewing moderator requests (approve/reject)
 * Used in: reviewModRequest controller
 */
export const reviewModRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

/**
 * Extracted params schema for mod request endpoints
 */
export const modRequestParamsSchema = z.object({
  userId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid user ID format",
  }),
});

/**
 * Combined schema for review endpoint (validates body + params)
 */
export const reviewModRequestCombinedSchema = reviewModRequestSchema.merge(
  modRequestParamsSchema,
);

/**
 * Combined schema for remove endpoint (validates params only)
 */
export const removeModRoleCombinedSchema = modRequestParamsSchema;

export type ReviewModRequestInput = z.infer<typeof reviewModRequestSchema>;
export type ModRequestParams = z.infer<typeof modRequestParamsSchema>;
export type ReviewModRequestCombined = z.infer<
  typeof reviewModRequestCombinedSchema
>;
export type RemoveModRoleCombined = z.infer<typeof removeModRoleCombinedSchema>;
