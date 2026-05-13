import { z } from "zod";

/**
 * Schema for rejecting syllabi
 * Used in: rejectSyllabus controller
 */
export const rejectSyllabusSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, { message: "Rejection reason must be at least 5 characters" })
    .max(500, { message: "Rejection reason must not exceed 500 characters" }),
});

/**
 * Extracted params schema for syllabus endpoints
 */
export const syllabusParamsSchema = z.object({
  syllabusId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid syllabus ID format",
  }),
});

export type RejectSyllabusInput = z.infer<typeof rejectSyllabusSchema>;
export type SyllabusParams = z.infer<typeof syllabusParamsSchema>;
