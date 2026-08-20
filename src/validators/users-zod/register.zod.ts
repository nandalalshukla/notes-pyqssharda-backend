import { z } from "zod";

/**
 * Base password schema - reusable across password-related endpoints
 * Must stay in sync with the Mongoose `password.minlength` in user.model.ts —
 * a mismatch there lets a password pass validation here and then fail at
 * `.save()` with a confusing 500 instead of a clean 400.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(128, { message: "Password must not exceed 128 characters" })
  .regex(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });

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

    // Charset/length must stay in sync with the Mongoose `username.match` /
    // minlength / maxlength in user.model.ts — a mismatch (e.g. allowing a
    // hyphen here that the model rejects) lets input pass validation and
    // then fail at `.save()` with a confusing 500 instead of a clean 400.
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, { message: "Username must be at least 3 characters" })
      .max(20, { message: "Username must not exceed 20 characters" })
      .regex(/^[a-z0-9._]+$/, {
        message:
          "Username can only contain lowercase letters, numbers, dots and underscores",
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
