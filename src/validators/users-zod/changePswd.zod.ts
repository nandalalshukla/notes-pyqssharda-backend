import { z } from "zod";
import { passwordSchema } from "./register.zod.js";

/**
 * Schema for changing password (when user is logged in).
 * No `email`/user-identifier field on purpose — this route is authenticated,
 * and the target account must always come from the verified access token
 * (req.user.userId), never from client-supplied input.
 * Used in: changePassword controller
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),

    newPassword: passwordSchema,

    confirmNewPassword: z.string().optional(),
  })
  .refine(
    (data) =>
      data.confirmNewPassword === undefined ||
      data.newPassword === data.confirmNewPassword,
    {
      message: "Passwords do not match",
      path: ["confirmNewPassword"],
    },
  )
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
