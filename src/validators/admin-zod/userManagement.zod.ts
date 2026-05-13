import { z } from "zod";

/**
 * Schema for deleting a user
 * Used in: deleteUser controller
 */
export const deleteUserParamsSchema = z.object({
  userId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "Invalid user ID format",
  }),
});

export type DeleteUserParams = z.infer<typeof deleteUserParamsSchema>;
