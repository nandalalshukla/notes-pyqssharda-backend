import { z } from "zod";

/**
 * Schema for global search across all resources
 * Used in: searchFromAllResources controller
 */
export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, { message: "Search query is required" })
    .max(100, { message: "Search query must not exceed 100 characters" }),

  resourceType: z
    .enum(["notes", "pyqs", "syllabus", "all"])
    .optional()
    .default("all"),

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

export type SearchInput = z.infer<typeof searchSchema>;
