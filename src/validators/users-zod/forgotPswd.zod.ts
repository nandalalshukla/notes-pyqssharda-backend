import { z } from "zod";
import { shardaEmailSchema, passwordSchema } from "./register.zod";

/**
 * Schema for forgot password (step 1) - request OTP
 * Used in: forgetPassword controller
 */
export const forgotPasswordSchema = z.object({
  email: shardaEmailSchema,
});

/**
 * Schema for creating new password (step 2) - reset with OTP
 * Used in: createNewPassword controller
 */
export const createNewPasswordSchema = z
  .object({
    email: shardaEmailSchema,

    otp: z
      .string()
      .trim()
      .length(6, { message: "OTP must be 6 digits" })
      .regex(/^\d+$/, { message: "OTP must contain only numbers" }),

    newPassword: passwordSchema,

    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type CreateNewPasswordInput = z.infer<typeof createNewPasswordSchema>;
