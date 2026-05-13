import { z } from "zod";

/**
 * Schema for deleting a note
 * Used in: deleteNote controller
 */
export const deleteNoteParamsSchema = z.object({
  noteId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid note ID format",
  }),
});

export type DeleteNoteParams = z.infer<typeof deleteNoteParamsSchema>;
