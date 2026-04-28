import { z } from "zod";

/**
 * Schema for notification operations
 * Used in: notification controllers
 */
export const notificationParamsSchema = z.object({
  notificationId: z
    .string()
    .refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
      message: "Invalid notification ID format",
    })
    .optional(),
});

/**
 * Schema for fetching notifications with pagination
 */
export const getNotificationsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .refine((val) => val > 0, { message: "Page must be greater than 0" }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20))
    .refine((val) => val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    }),
  read: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
});

/**
 * Schema for marking notifications as read
 */
export const markNotificationReadSchema = z.object({
  notificationId: z
    .string()
    .refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
      message: "Invalid notification ID format",
    })
    .optional(),
  markAll: z.boolean().optional().default(false),
});

export type NotificationParams = z.infer<typeof notificationParamsSchema>;
export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>;
export type MarkNotificationReadInput = z.infer<
  typeof markNotificationReadSchema
>;
