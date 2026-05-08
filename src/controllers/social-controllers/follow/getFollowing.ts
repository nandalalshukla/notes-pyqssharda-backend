// controllers/follow/getFollowing.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";

export const getFollowing = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const following = await Follow.find({ follower: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("following", "name username profilePic bio");

    const total = await Follow.countDocuments({ follower: userId });
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        data: following.map((f) => f.following),
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    console.error("getFollowing error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
