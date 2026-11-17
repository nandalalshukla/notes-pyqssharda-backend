import { z } from "zod";

export const siteAnalyticsPulseSchema = z
  .object({
    browserId: z.string().uuid(),
    pageViewId: z.string().uuid(),
  })
  .strict();

export type SiteAnalyticsPulseInput = z.infer<
  typeof siteAnalyticsPulseSchema
>;
