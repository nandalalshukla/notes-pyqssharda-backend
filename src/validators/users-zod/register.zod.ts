import { z } from "zod";

/**
 * Base password schema - reusable across password-related endpoints
 * Enforces: min 6 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const passwordSchema = z
  .string()
  .min(6, { message: "Password must be at least 6 characters" })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[@$!%*?&#]/, {
    message: "Password must contain at least one special character (@$!%*?&#)",
  });

/**
 * Base email schema - reusable across all email-related endpoints
 * Sharda University specific validation
 */
export const shardaEmailSchema = z
  .string()
  .email({ message: "Invalid email format" })
  .trim()
  .toLowerCase()
  .refine(
    (email) => {
      const domain = email.split("@")[1];
      return domain === "ug.sharda.ac.in";
    },
    {
      message:
        "Only Sharda University student emails (ug.sharda.ac.in) are allowed",
    },
  );

/**
 * Schema for user registration
 * Used in: registerUser controller
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, { message: "Name must be at least 3 characters" })
      .max(50, { message: "Name must not exceed 50 characters" })
      .regex(/^[a-zA-Z\s]+$/, {
        message: "Name can only contain letters and spaces",
      }),

    username: z
      .string()
      .trim()
      .min(3, { message: "Username must be at least 3 characters" })
      .max(30, { message: "Username must not exceed 30 characters" })
      .regex(/^[a-zA-Z0-9_-]+$/, {
        message:
          "Username can only contain letters, numbers, hyphens, and underscores",
      }),

    email: shardaEmailSchema,

    password: passwordSchema,

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
