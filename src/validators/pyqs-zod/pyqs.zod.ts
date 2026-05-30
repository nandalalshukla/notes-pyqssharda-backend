import { z } from "zod";
import { resourceMetadataSchema } from "../notes-zod/notes.zod.js";

/**
 * Schema for uploading PYQs (Previous Year Questions)
 * fileUrl is optional here because it's set by the controller after file upload
 * year is a string like "2024-25" (academic year format)
 */
export const pyqsUploadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title must not exceed 100 characters" }),
  year: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, {
      message: "Year must be in format YYYY-YY (e.g., 2024-25)",
    }),
  ...resourceMetadataSchema.shape,
});

/**
 * Schema for validating uploaded PYQs with fileUrl
 * Used in controller after file is uploaded
 */
export const pyqsSchema = pyqsUploadSchema.extend({
  fileUrl: z.string().url({ message: "Invalid file URL format" }),
});

/**
 * Schema for updating PYQ metadata
 */
export const updatePYQsSchema = pyqsSchema.partial();

/**
 * Schema for PYQs query/filtering
 */
export const pyqsQuerySchema = z.object({
  program: z.string().optional(),
  courseCode: z.string().optional(),
  semester: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
  year: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
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

export type PYQsInput = z.infer<typeof pyqsSchema>;
export type UpdatePYQsInput = z.infer<typeof updatePYQsSchema>;
export type PYQsQueryInput = z.infer<typeof pyqsQuerySchema>;
