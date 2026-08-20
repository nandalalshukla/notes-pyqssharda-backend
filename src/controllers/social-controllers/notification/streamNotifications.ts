import { Request, Response } from "express";
import { subscribe } from "../../../services/social/notificationStream.service.js";
import { Notification } from "../../../models/social/notification.model.js";

/**
 * Server-Sent Events stream of this user's notifications. The client opens
 * this once (via EventSource, which auto-reconnects on its own) and
 * receives `notification` / `unread-count` events in real time instead of
 * polling. See notificationStream.service.ts for the publish side.
 */
export const streamNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const unsubscribe = subscribe(userId, res);
  req.on("close", unsubscribe);

  // Prime the client with the current unread count immediately on connect,
  // so the badge is correct even before anything new happens.
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });
    res.write(`event: unread-count\n`);
    res.write(`data: ${JSON.stringify({ unreadCount })}\n\n`);
  } catch (error) {
    console.error("streamNotifications initial count failed:", error);
  }
};
