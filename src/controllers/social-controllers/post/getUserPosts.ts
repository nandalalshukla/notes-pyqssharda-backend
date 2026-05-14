import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../../../models/social/post.model.js";
import { User } from "../../../models/users/user.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Follow } from "../../../models/social/follow.model.js";

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
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);
    const likeCountByPostId = new Map(
      likeCounts.map((item: any) => [item._id.toString(), item.count]),
    );

    const likedPostIds = userObjectId
      ? await Like.find({ user: userObjectId, post: { $in: postIds } })
          .select("post")
          .lean()
      : [];
    const likedPostIdSet = new Set(
      likedPostIds.map((like: any) => like.post.toString()),
    );

    const isFollowedByCurrentUser =
      userObjectId && currentUserId !== userId
        ? !!(await Follow.exists({
            follower: userObjectId,
            following: userId,
          }))
        : false;

    const postsWithEngagement = posts.map((post: any) => {
      const postId = post._id.toString();
      const likesCount = likeCountByPostId.get(postId) ?? 0;
      const userLiked = likedPostIdSet.has(postId);

      const files = post.media?.map((m: any) => m.url) || [];
      const publicIds = post.media?.map((m: any) => m.publicId) || [];

      return {
        _id: post._id,
        content: post.content,
        author: {
          _id: post.author._id,
          username: post.author.username || "Anonymous",
          avatar: post.author.profilePic?.url || "",
          profilePic: post.author.profilePic,
          isFollowedByCurrentUser,
        },
        files,
        publicIds,
        likes: likesCount,
        likedByCurrentUser: !!userLiked,
        commentCount: post.commentsCount || 0,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        data: postsWithEngagement,
        totalPages,
        currentPage: page,
        total,
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
