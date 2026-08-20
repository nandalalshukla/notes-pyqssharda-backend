import { Request, Response } from "express";
import { Notification } from "../../../models/social/notification.model.js";

export const getUnreadCount = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (err) {
    throw err;
  }
};
