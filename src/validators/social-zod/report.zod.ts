import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createReportSchema = z.object({
  targetType: z.enum(["post", "comment", "user"]),
  targetId: z.string().regex(objectIdRegex, "Invalid target ID format"),
  reason: z.enum([
    "spam",
    "harassment",
    "hate",
    "nudity",
    "violence",
    "fake_information",
    "scam",
    "other",
  ]),
  message: z
    .string()
    .trim()
    .max(500, { message: "Message must not exceed 500 characters" })
    .optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
