import { z } from "zod";

/**
 * Base schema for resource metadata (used across notes, pyqs, syllabus)
 */
export const resourceMetadataSchema = z.object({
  program: z
    .string()
    .trim()
    .min(2, { message: "Program must be at least 2 characters" })
    .max(100, { message: "Program must not exceed 100 characters" }),
  courseCode: z
    .string()
    .trim()
    .min(2, { message: "Course code must be at least 2 characters" })
    .max(20, { message: "Course code must not exceed 20 characters" })
    .regex(/^[A-Z0-9 ]+$/, { message: "Course code must be alphanumeric (spaces allowed)" }),
  courseName: z
    .string()
    .trim()
    .min(2, { message: "Course name must be at least 2 characters" })
    .max(100, { message: "Course name must not exceed 100 characters" }),
  semester: z.coerce
    .number()
    .int({ message: "Semester must be a whole number" })
    .min(1, { message: "Semester must be at least 1" })
    .max(12, { message: "Semester must not exceed 12" }),
});

/**
 * Schema for uploading notes (file handled by multer)
 * fileUrl is optional here because it's set by the controller after file upload
 */
export const notesUploadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title must not exceed 100 characters" }),
  ...resourceMetadataSchema.shape,
});

/**
 * Schema for validating uploaded notes with fileUrl
 * Used in controller after file is uploaded
 */
export const notesSchema = notesUploadSchema.extend({
  fileUrl: z.string().url({ message: "Invalid file URL format" }),
});

/**
 * Schema for updating notes metadata. A replacement file, if any, arrives
 * via multer (see notes.route.ts) — not as a `fileUrl` string in the body —
 * so this is based on the upload schema, not `notesSchema`.
 */
export const updateNotesSchema = notesUploadSchema.partial();

/**
 * Schema for notes query/filtering
 */
export const notesQuerySchema = z.object({
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

export type NotesInput = z.infer<typeof notesSchema>;
export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
export type NotesQueryInput = z.infer<typeof notesQuerySchema>;
