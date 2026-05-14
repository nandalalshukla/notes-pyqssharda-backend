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
    // Fetch ALL posts (from all users) ordered by latest, regardless of follows
    const posts = await Post.find({
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "_id username profilePic email role")
      .lean();

    // Get likes count for each post and check if current user liked it
    const postIds = posts.map((post: any) => post._id);
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

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

    const authorIds = [
      ...new Set(posts.map((post: any) => post.author._id.toString())),
    ].map((authorId) => new mongoose.Types.ObjectId(authorId));

    const followedAuthors = userObjectId
      ? await Follow.find({
          follower: userObjectId,
          following: { $in: authorIds },
        })
          .select("following")
          .lean()
      : [];
    const followedAuthorIdSet = new Set(
      followedAuthors.map((follow: any) => follow.following.toString()),
    );

    const postsWithEngagement = await Promise.all(
      posts.map(async (post: any) => {
        const postId = post._id.toString();
        const likesCount = likeCountByPostId.get(postId) ?? 0;
        const userLiked = likedPostIdSet.has(postId);

        const commentsCount = post.commentsCount || 0;

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
          likes: likesCount,
          likedByCurrentUser: !!userLiked,
          commentCount: commentsCount,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      }),
    );

    const total = await Post.countDocuments({
      isDeleted: false,
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
