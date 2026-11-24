//admin will manage all the moderators via this controller

import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import {
  moderatorRejectionMail,
  moderatorApprovalMail,
} from "../../utils/email.js";

export const fetchModRequests = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const filter = { modRequest: "pending", role: "user" };
    const [mods, total] = await Promise.all([
      User.find(filter)
        .select("_id name email username role isActive contributions contactNo modMotivation modRequestAt")
        .sort({ modRequestAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true,
      mods,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    throw error;
  }
};

//approve or reject mod request
export const reviewModRequest = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { action } = req.body; // 'approve' or 'reject'
  try {
    const user = await User.findById(userId);
    if (!user || !user.modRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Mod request not found" });
    }
    if (action === "approve") {
      user.role = "mod";
      user.modRequest = "approved";
      await user.save();
      //send approval email
      const approveResult = await moderatorApprovalMail(user.email, user.name);
      if (!approveResult.success) {
        console.warn(
          `Failed to send approval email to ${user.email}`,
          approveResult.error,
        );
      }
      return res.status(200).json({
        success: true,
        message: "Moderator request approved successfully",
      });
    } else if (action === "reject") {
      user.role = "user";
      user.modRequest = "rejected";
      await user.save();
      //send rejection email
      const rejectResult = await moderatorRejectionMail(user.email, user.name);
      if (!rejectResult.success) {
        console.warn(
          `Failed to send rejection email to ${user.email}`,
          rejectResult.error,
        );
      }
      return res.status(200).json({
        success: true,
        message: "Moderator request rejected successfully",
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }
  } catch (error) {
    throw error;
  }
};

//fetch all the mods

export const fetchAllMods = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const filter = { role: "mod" };
    const [mods, total, active] = await Promise.all([
      User.find(filter)
        .select(
          "name email username role contributions isEmailVerified isActive createdAt",
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      User.countDocuments({ ...filter, isActive: true }),
    ]);
    res.status(200).json({
      success: true,
      mods,
      counts: { active },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    throw error;
  }
};

//remove mod role from a user
export const removeModRole = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const user = await User.findOne(
      { _id: userId, role: "mod" },
      "-password -__v",
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.role = "user";

    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "Moderator role removed successfully" });
  } catch (error) {
    throw error;
  }
};
