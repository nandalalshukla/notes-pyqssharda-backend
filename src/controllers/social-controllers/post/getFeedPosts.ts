// controllers/feed/getFeed.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";
import { Post } from "../../../models/social/post.model.js";

export const getFeed = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    // Get all users this person follows
    const following = await Follow.find({ follower: userId }).select(
      "following",
    );
    const followingIds = following.map((f) => f.following);

    // Include own posts in feed too
    const feedAuthorIds = [...followingIds, userId];

    const posts = await Post.find({
      author: { $in: feedAuthorIds },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic role");

    const total = await Post.countDocuments({
      author: { $in: feedAuthorIds },
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: { page, limit, total, hasMore: page * limit < total },
      },
    });
  } catch (err) {
    console.error("getFeed error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
