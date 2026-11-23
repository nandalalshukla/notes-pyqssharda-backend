// controllers/notification/getNotifications.ts
import { Request, Response } from "express";
import { Notification } from "../../../models/social/notification.model.js";
import type {
  PopulatedUserSummary,
  PopulatedNotificationPostRef,
  PopulatedNotificationCommentRef,
} from "../../../types/social.types.js";
import { hasPopulatedUserSummary } from "../../../utils/socialSerializers.js";

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
        .populate<{ actor: PopulatedUserSummary | null }>({
          path: "actor",
          select: "username profilePic role _id",
        })
        .populate<{ post: PopulatedNotificationPostRef | null }>({
          path: "post",
          select: "_id",
        })
        .populate<{ comment: PopulatedNotificationCommentRef | null }>({
          path: "comment",
          select: "_id post",
        })
        .lean(),
      Notification.countDocuments({ recipient: userId, isRead: false }),
      Notification.countDocuments(baseQuery),
    ]);

    const orphanedNotificationIds = notifications
      .filter((notif) => isBrokenNotification(notif))
      .map((notif) => notif._id);
    const visibleNotifications = notifications.filter(
      (notif) => !isBrokenNotification(notif),
    );

    if (orphanedNotificationIds.length > 0) {
      await Notification.deleteMany({ _id: { $in: orphanedNotificationIds } });
    }

    // Format notifications with readable messages
    const formattedNotifications = visibleNotifications.map((notif) => ({
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
    throw err;
  }
};

/**
 * Only the fields these two helpers actually read — deliberately narrower
 * than the full populated notification shape returned by getNotifications.
 */
type NotificationForFormatting = {
  type:
    | "like"
    | "comment"
    | "reply"
    | "mention_post"
    | "mention_comment"
    | "follow"
    | "share"
    | "post_approved"
    | "post_rejected";
  actor: PopulatedUserSummary | null;
  post: PopulatedNotificationPostRef | null;
  comment?: PopulatedNotificationCommentRef | null;
};

function isBrokenNotification(notif: NotificationForFormatting): boolean {
  if (!hasPopulatedUserSummary(notif.actor)) return true;
  if (notif.type === "follow") return false;
  if (!notif.post) return true;
  if (
    (notif.type === "comment" ||
      notif.type === "reply" ||
      notif.type === "mention_comment") &&
    !notif.comment
  ) {
    return true;
  }
  return false;
}

function formatNotificationMessage(notif: NotificationForFormatting): string {
  const actorName = notif.actor?.username || "Someone";

  switch (notif.type) {
    case "follow":
      return `${actorName} followed you.`;
    case "like":
      return `${actorName} liked your post.`;
    case "comment":
      return `${actorName} commented on your post.`;
    case "reply":
      return `${actorName} replied to your comment.`;
    case "mention_post":
      return `${actorName} mentioned you in a post.`;
    case "mention_comment":
      return `${actorName} mentioned you in a comment.`;
    case "share":
      return `${actorName} shared your post.`;
    // Deliberately impersonal: who reviewed a post is between the
    // moderation team and the post, not something to put in front of the
    // author as "so-and-so rejected you".
    case "post_approved":
      return "Your post was approved and is now live.";
    case "post_rejected":
      return "Your post wasn't approved. Open it to see why.";
    default:
      return "New notification";
  }
}

function getActionLink(notif: NotificationForFormatting): string {
  if (notif.type === "follow") {
    return `/profile/${notif.actor?._id}`;
  } else if (
    notif.type === "like" ||
    notif.type === "comment" ||
    notif.type === "reply" ||
    notif.type === "mention_post" ||
    notif.type === "mention_comment" ||
    notif.type === "share" ||
    notif.type === "post_approved" ||
    notif.type === "post_rejected"
  ) {
    return `/?postId=${notif.post?._id}`;
  }
  return "/";
}
