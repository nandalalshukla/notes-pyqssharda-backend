// controllers/feed/getFeed.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";
import { Post } from "../../../models/social/post.model.js";
import { Like } from "../../../models/social/like.model.js";
import mongoose from "mongoose";

export const getFeed = async (req: Request, res: Response) => {
  const userId = req.user?.userId; // Optional - handle both authenticated and non-authenticated users
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    let feedAuthorIds: any[] = [];

    // If user is authenticated, get their following list
    if (userId) {
      const following = await Follow.find({ follower: userId }).select(
        "following",
      );
      const followingIds = following.map((f) => f.following);
      feedAuthorIds = [...followingIds, userId];
    } else {
      // If not authenticated, show all public posts (from all authors)
      const allUsers = await mongoose.connection
        .collection("users")
        .find({})
        .project({ _id: 1 })
        .toArray();
      feedAuthorIds = allUsers.map((u: any) => u._id);
    }

    // Fetch posts with proper population
    const posts = await Post.find({
      author: { $in: feedAuthorIds },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "_id username avatar email role")
      .lean();

    // Get likes count for each post and check if current user liked it
    const postsWithEngagement = await Promise.all(
      posts.map(async (post: any) => {
        const likesCount = await Like.countDocuments({
          post: post._id,
        });

        const userLiked = userId
          ? await Like.exists({
              post: post._id,
              user: userId,
            })
          : null;

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
            avatar: post.author.avatar,
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
      author: { $in: feedAuthorIds },
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
