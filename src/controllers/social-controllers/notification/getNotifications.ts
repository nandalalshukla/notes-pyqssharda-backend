// controllers/notification/getNotifications.ts
import { Request, Response } from "express";
import { Notification } from "../../../models/social/notification.model.js";

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actor", "name username profilePic")
      .populate("post", "content media")
      .populate("comment", "content");

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    const total = await Notification.countDocuments({ recipient: userId });

    return res.status(200).json({
      success: true,
      data: {
        notifications,
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
