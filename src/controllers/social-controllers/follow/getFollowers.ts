// controllers/follow/getFollowers.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";

export const getFollowers = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const [followers, total] = await Promise.all([
      Follow.find({ following: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("follower")
        .populate("follower", "name username profilePic bio role")
        .lean(),
      Follow.countDocuments({ following: userId }),
    ]);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        data: followers.map((f) => f.follower),
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    console.error("getFollowers error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
