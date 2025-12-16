//change password zod schema
import { email, z } from "zod";

export const changePasswordSchema = z
    .object({
        email: z
            .email({ message: "Invalid email format" })
            .trim()
            .toLowerCase(),
        currentPassword: z
            .string()
            .min(6, { message: "Minimum 6 characters" })
            .regex(/[A-Z]/, { message: "One uppercase letter required" })
            .regex(/[a-z]/, { message: "One lowercase letter required" })
            .regex(/[0-9]/, { message: "One number required" })
            .regex(/[@$!%*?&#]/, { message: "One special character required" }),
        newPassword: z
            .string()
            .min(6, { message: "Minimum 6 characters" })
            .regex(/[A-Z]/, { message: "One uppercase letter required" })
            .regex(/[a-z]/, { message: "One lowercase letter required" })
            .regex(/[0-9]/, { message: "One number required" })
            .regex(/[@$!%*?&#]/, { message: "One special character required" }),
        confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords do not match",
    });
        
