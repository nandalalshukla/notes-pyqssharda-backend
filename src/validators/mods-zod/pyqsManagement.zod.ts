import { z } from "zod";

/**
 * Schema for rejecting PYQs
 * Used in: rejectPYQ controller
 */
export const rejectPYQSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, { message: "Rejection reason must be at least 5 characters" })
    .max(500, { message: "Rejection reason must not exceed 500 characters" }),
});

/**
 * Extracted params schema for PYQ endpoints
 */
export const pyqParamsSchema = z.object({
  pyqId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid PYQ ID format",
  }),
});

export type RejectPYQInput = z.infer<typeof rejectPYQSchema>;
export type PYQParams = z.infer<typeof pyqParamsSchema>;
