// controllers/notification/getNotifications.ts
import { Request, Response } from "express";
import { Notification } from "../../../models/social/notification.model.js";

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const readParam = req.query.read as string | undefined;
  const readFilter =
    readParam === "true" ? true : readParam === "false" ? false : undefined;
  const baseQuery = {
    recipient: userId,
    ...(readFilter !== undefined ? { isRead: readFilter } : {}),
  };

  try {
    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "actor",
          select: "username profilePic _id",
        })
        .populate({
          path: "post",
          select: "_id",
        })
        .populate({
          path: "comment",
          select: "_id post",
        })
        .lean(),
      Notification.countDocuments({ recipient: userId, isRead: false }),
      Notification.countDocuments(baseQuery),
    ]);

    // Format notifications with readable messages
    const formattedNotifications = notifications.map((notif: any) => ({
      _id: notif._id,
      type: notif.type,
      actor: notif.actor,
      post: notif.post,
      comment: notif.comment,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
      message: formatNotificationMessage(notif),
      actionLink: getActionLink(notif),
    }));

    return res.status(200).json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unreadCount,
        pagination: { page, limit, total, hasMore: page * limit < total },
      },
    });
  } catch (err) {
    console.error("getNotifications error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

function formatNotificationMessage(notif: any): string {
  const actorName = notif.actor?.username || "Someone";

  switch (notif.type) {
    case "follow":
      return `${actorName} followed you.`;
    case "like":
      return `${actorName} liked your post.`;
    case "comment":
      return `${actorName} commented on your post.`;
    case "share":
      return `${actorName} shared your post.`;
    default:
      return "New notification";
  }
}

function getActionLink(notif: any): string {
  if (notif.type === "follow") {
    return `/profile/${notif.actor?._id}`;
  } else if (
    notif.type === "like" ||
    notif.type === "comment" ||
    notif.type === "share"
  ) {
    return `/feed?postId=${notif.post?._id}`;
  }
  return "/";
}
