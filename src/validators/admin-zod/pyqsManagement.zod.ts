import { z } from "zod";

/**
 * Schema for deleting a PYQ
 * Used in: deletePYQ controller
 */
export const deletePYQParamsSchema = z.object({
  pyqId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid PYQ ID format",
  }),
});

export type DeletePYQParams = z.infer<typeof deletePYQParamsSchema>;
