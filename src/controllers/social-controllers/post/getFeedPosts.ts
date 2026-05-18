// controllers/feed/getFeed.ts
import { Request, Response } from "express";
import { Post } from "../../../models/social/post.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Follow } from "../../../models/social/follow.model.js";
import mongoose from "mongoose";

export const getFeed = async (req: Request, res: Response) => {
  const userId = req.user?.userId; // Optional - handle both authenticated and non-authenticated users
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const [posts, total] = await Promise.all([
      Post.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "content author media likesCount commentsCount createdAt updatedAt",
        )
        .populate("author", "_id username profilePic")
        .lean(),
      Post.countDocuments({ isDeleted: false }),
    ]);

    const postIds = posts.map((post: any) => post._id);
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const [likedPostIds, followedAuthors] = await Promise.all([
      userObjectId && postIds.length > 0
        ? Like.find({ user: userObjectId, post: { $in: postIds } })
            .select("post")
            .lean()
        : Promise.resolve([]),
      userObjectId && postIds.length > 0
        ? Follow.find({
            follower: userObjectId,
            following: { $in: posts.map((post: any) => post.author._id) },
          })
            .select("following")
            .lean()
        : Promise.resolve([]),
    ]);

    const likedPostIdSet = new Set(
      likedPostIds.map((like: any) => like.post.toString()),
    );
    const followedAuthorIdSet = new Set(
      followedAuthors.map((follow: any) => follow.following.toString()),
    );

    const postsWithEngagement = posts.map((post: any) => {
      const postId = post._id.toString();

      // Transform media to match frontend expectations
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
          isFollowedByCurrentUser: followedAuthorIdSet.has(
            post.author._id.toString(),
          ),
        },
        files,
        publicIds,
        likes: post.likesCount || 0,
        likedByCurrentUser: likedPostIdSet.has(postId),
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
  } catch (err) {
    console.error("getFeed error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
