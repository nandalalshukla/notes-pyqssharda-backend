import { z } from "zod";
import { resourceMetadataSchema } from "../notes-zod/notes.zod.js";

/**
 * Schema for uploading Syllabus
 * fileUrl is optional here because it's set by the controller after file upload
 */
export const syllabusUploadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title must not exceed 100 characters" }),
  ...resourceMetadataSchema.shape,
});

/**
 * Schema for validating uploaded Syllabus with fileUrl
 * Used in controller after file is uploaded
 */
export const syllabusSchema = syllabusUploadSchema.extend({
  fileUrl: z.string().url({ message: "Invalid file URL format" }),
});

/**
 * Schema for updating Syllabus metadata. A replacement file, if any,
 * arrives via multer (see syllabus.route.ts) — not as a `fileUrl` string in
 * the body — so this is based on the upload schema, not `syllabusSchema`.
 */
export const updateSyllabusSchema = syllabusUploadSchema.partial();

/**
 * Schema for Syllabus query/filtering
 */
export const syllabusQuerySchema = z.object({
  program: z.string().optional(),
  courseCode: z.string().optional(),
  semester: z
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

export type SyllabusInput = z.infer<typeof syllabusSchema>;
export type UpdateSyllabusInput = z.infer<typeof updateSyllabusSchema>;
export type SyllabusQueryInput = z.infer<typeof syllabusQuerySchema>;
