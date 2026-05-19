import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const reportActionParamsSchema = z.object({
  reportId: z.string().regex(objectIdRegex, "Invalid report ID format"),
});

export type ReportActionParams = z.infer<typeof reportActionParamsSchema>;
