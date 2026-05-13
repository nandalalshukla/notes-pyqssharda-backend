// controllers/notification/markAsRead.ts
import { Request, Response } from "express";
import { Notification } from "../../../models/social/notification.model.js";

export const markOneAsRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const userId = req.user!.userId;

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId }, // recipient check prevents reading others' notifications
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ success: true, message: "Marked as read" });
  } catch (err) {
    console.error("markOneAsRead error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true },
    );

    return res
      .status(200)
      .json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
