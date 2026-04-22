import { Request, Response } from "express";
import { Notification } from "../../models/sharda-social/notification.model.js";
import mongoose from "mongoose";

/**
 * Get notifications for current user
 * @route GET /api/v1/notifications
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
      .populate("actor", "name username profilePic")
      .populate("post", "content")
      .populate("comment", "content")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Notification.countDocuments({ recipient: userId });
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map((notif) => ({
          id: notif._id,
          type: notif.type,
          actor: {
            id: (notif.actor as any)._id,
            name: (notif.actor as any).name,
            username: (notif.actor as any).username,
            profilePic: (notif.actor as any).profilePic?.url,
          },
          post: notif.post ? { id: (notif.post as any)._id } : null,
          comment: notif.comment ? { id: (notif.comment as any)._id } : null,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        unreadCount,
      },
      message: "Notifications fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Mark notification as read
 * @route PUT /api/v1/notifications/:notificationId/read
 */
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Authorization check
    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      data: {},
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Mark all notifications as read
 * @route PUT /api/v1/notifications/mark-all-read
 */
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true },
    );

    return res.status(200).json({
      success: true,
      data: {},
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get unread notifications count
 * @route GET /api/v1/notifications/unread/count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
      message: "Unread count fetched",
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete a notification
 * @route DELETE /api/v1/notifications/:notificationId
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Authorization check
    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await notification.deleteOne();

    return res.status(200).json({
      success: true,
      data: {},
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Clear all notifications
 * @route DELETE /api/v1/notifications/clear-all
 */
export const clearAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await Notification.deleteMany({ recipient: userId });

    return res.status(200).json({
      success: true,
      data: {},
      message: "All notifications cleared",
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
