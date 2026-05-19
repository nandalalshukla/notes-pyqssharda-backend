import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const reportQuerySchema = z.object({
  status: z.enum(["pending", "reviewed", "resolved", "rejected"]).optional(),
  targetType: z.enum(["post", "comment", "user"]).optional(),
  sortBy: z.enum(["createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z
    .string()
    .trim()
    .max(100, { message: "Search must not exceed 100 characters" })
    .optional(),
  page: z
    .string()
    .optional()
    .refine((value) => !value || /^[0-9]+$/.test(value), {
      message: "Page must be a valid number",
    }),
  limit: z
    .string()
    .optional()
    .refine((value) => !value || /^[0-9]+$/.test(value), {
      message: "Limit must be a valid number",
    }),
});

export const reportParamsSchema = z.object({
  reportId: z.string().regex(objectIdRegex, "Invalid report ID format"),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type ReportParams = z.infer<typeof reportParamsSchema>;
