import { z } from "zod";

/**
 * Schema for rejecting notes
 * Used in: rejectNote controller
 */
export const rejectNoteSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, { message: "Rejection reason must be at least 5 characters" })
    .max(500, { message: "Rejection reason must not exceed 500 characters" }),
});

/**
 * Extracted params schema for note endpoints
 */
export const noteParamsSchema = z.object({
  noteId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid note ID format",
  }),
});

export type RejectNoteInput = z.infer<typeof rejectNoteSchema>;
export type NoteParams = z.infer<typeof noteParamsSchema>;
