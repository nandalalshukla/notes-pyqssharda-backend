//forgot password zod schema
import { z } from "zod";  


export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email({ message: "Invalid email format" }).trim().toLowerCase(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const createNewPasswordSchema = z.object({
  body: z.object({
    otp: z
      .string()
      .length(6, { message: "OTP must be 6 digits" })
      .regex(/^\d+$/, { message: "OTP must contain only digits" }),
    newPassword: z
      .string()
      .min(6, { message: "Minimum 6 characters" })
      .regex(/[A-Z]/, { message: "One uppercase letter required" })
      .regex(/[a-z]/, { message: "One lowercase letter required" })
      .regex(/[0-9]/, { message: "One number required" })
      .regex(/[@$!%*?&#]/, { message: "One special character required" }),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});


