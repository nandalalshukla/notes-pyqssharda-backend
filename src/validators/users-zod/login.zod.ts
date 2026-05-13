import { z } from "zod";
import { shardaEmailSchema, passwordSchema } from "./register.zod.js";

/**
 * Schema for user login
 * Used in: loginUser controller
 */
export const loginSchema = z.object({
  email: shardaEmailSchema,

  password: z.string().min(1, { message: "Password is required" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
