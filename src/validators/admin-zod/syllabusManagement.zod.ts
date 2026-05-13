import { z } from "zod";

/**
 * Schema for deleting a syllabus
 * Used in: deleteSyllabus controller
 */
export const deleteSyllabusParamsSchema = z.object({
  syllabusId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid syllabus ID format",
  }),
});

export type DeleteSyllabusParams = z.infer<typeof deleteSyllabusParamsSchema>;
