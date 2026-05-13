import { z } from "zod";
import { shardaEmailSchema, passwordSchema } from "./register.zod";

/**
 * Schema for changing password (when user is logged in)
 * Used in: changePassword controller
 */
export const changePasswordSchema = z
  .object({
    email: shardaEmailSchema,

    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),

    newPassword: passwordSchema,

    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
