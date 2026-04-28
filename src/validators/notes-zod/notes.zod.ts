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
    .regex(/^[A-Z0-9]+$/, { message: "Course code must be alphanumeric" }),
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
 * Schema for uploading notes
 * Used in: uploadNotes controller (file handled by multer)
 */
export const notesSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title must not exceed 100 characters" }),
  fileUrl: z.string().url({ message: "Invalid file URL format" }),
  ...resourceMetadataSchema.shape,
});

/**
 * Schema for updating notes metadata
 */
export const updateNotesSchema = notesSchema.partial();

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
