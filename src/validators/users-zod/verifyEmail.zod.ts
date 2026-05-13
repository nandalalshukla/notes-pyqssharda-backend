import { z } from "zod";
import { shardaEmailSchema } from "./register.zod";

/**
 * Schema for email verification with OTP
 * Used in: verifyEmail controller
 */
export const verifyEmailSchema = z.object({
  email: shardaEmailSchema,

  otp: z
    .string()
    .trim()
    .length(6, { message: "OTP must be 6 digits" })
    .regex(/^\d+$/, { message: "OTP must contain only numbers" }),
});

/**
 * Schema for resending OTP
 * Used in: resendOtp controller
 */
export const resendOtpSchema = z.object({
  email: shardaEmailSchema,
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
