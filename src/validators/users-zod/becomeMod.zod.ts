import { z } from "zod";

/**
 * Schema for becoming a moderator request
 * Used in: becomeModerator controller
 */
export const becomeModeratorSchema = z.object({
  contactNo: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, {
      message: "Contact number must be exactly 10 digits",
    }),

  motivation: z
    .string()
    .trim()
    .min(20, { message: "Motivation must be at least 20 characters" })
    .max(1000, { message: "Motivation must not exceed 1000 characters" }),
});

export type BecomeModeratorInput = z.infer<typeof becomeModeratorSchema>;
