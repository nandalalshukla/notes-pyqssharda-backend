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
    throw err;
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true },
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: { markedCount: result.modifiedCount },
    });
  } catch (err) {
    throw err;
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const userId = req.user!.userId;

  try {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId,
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (err) {
    throw err;
  }
};
