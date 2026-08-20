// controllers/comment/getComments.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";

export const getComments = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?.userId; // Optional for non-authenticated users
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const [comments, total] = await Promise.all([
      Comment.find({
        post: postId,
        parentComment: null,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("content author post likesCount createdAt updatedAt")
        .populate("author", "_id username profilePic role")
        .lean(),
      Comment.countDocuments({
        post: postId,
        parentComment: null,
        isDeleted: false,
      }),
    ]);

    const commentIds = comments.map((comment: any) => comment._id);
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const likedCommentIds =
      userObjectId && commentIds.length > 0
        ? await Like.find({ user: userObjectId, comment: { $in: commentIds } })
            .select("comment")
            .lean()
        : [];
    const likedCommentIdSet = new Set(
      likedCommentIds.map((like: any) => like.comment.toString()),
    );

    const commentsWithLikes = comments.map((comment: any) => {
      const commentId = comment._id.toString();
      const userLiked = likedCommentIdSet.has(commentId);

      return {
        _id: comment._id,
        text: comment.content,
        author: {
          _id: comment.author._id,
          username: comment.author.username || "Anonymous",
          avatar: comment.author.profilePic?.url || "",
          profilePic: comment.author.profilePic,
          role: comment.author.role,
        },
        post: comment.post,
        likes: comment.likesCount || 0,
        likedByCurrentUser: !!userLiked,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        comments: commentsWithLikes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (err) {
    throw err;
  }
};
