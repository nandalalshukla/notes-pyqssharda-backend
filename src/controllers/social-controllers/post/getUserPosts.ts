import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../../../models/social/post.model.js";
import { User } from "../../../models/users/user.model.js";
import { Like } from "../../../models/social/like.model.js";

export const getUserPosts = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const currentUserId = req.user?.userId;

  try {
    const user = await User.findById(userId).select("_id +isActive");
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const posts = await Post.find({
      author: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "_id username profilePic email role bio")
      .lean();

    const total = await Post.countDocuments({
      author: userId,
      isDeleted: false,
    });

    const postIds = posts.map((post: any) => post._id);
    const userObjectId = currentUserId
      ? new mongoose.Types.ObjectId(currentUserId)
      : null;

    const likeCounts = await Like.aggregate([
      { $match: { post: { $in: postIds } } },
      {
        $group: {
          _id: "$post",
          count: { $sum: 1 },
          likedByUser: {
            $sum: userObjectId
              ? { $cond: [{ $eq: ["$liker", userObjectId] }, 1, 0] }
              : 0,
          },
        },
      },
    ]);

    const likeMap = new Map(
      likeCounts.map((like) => [
        like._id.toString(),
        {
          count: like.count,
          likedByCurrentUser: userObjectId ? like.likedByUser > 0 : false,
        },
      ]),
    );

    const enrichedPosts = posts.map((post: any) => {
      const likeData = likeMap.get(post._id.toString());
      return {
        ...post,
        likes: likeData?.count || 0,
        likedByCurrentUser: likeData?.likedByCurrentUser || false,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        posts: enrichedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (err: unknown) {
    console.error("getUserPosts error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
