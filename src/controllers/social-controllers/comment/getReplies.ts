import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";

export const getReplies = async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;
  const userId = req.user?.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const [replies, total] = await Promise.all([
      Comment.find({
        post: postId,
        parentComment: commentId,
        isDeleted: false,
      })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .select(
          "content author post parentComment likesCount createdAt updatedAt",
        )
        .populate("author", "_id username profilePic")
        .lean(),
      Comment.countDocuments({
        post: postId,
        parentComment: commentId,
        isDeleted: false,
      }),
    ]);

    const replyIds = replies.map((reply: any) => reply._id);
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const likedReplyIds =
      userObjectId && replyIds.length > 0
        ? await Like.find({ user: userObjectId, comment: { $in: replyIds } })
            .select("comment")
            .lean()
        : [];
    const likedReplyIdSet = new Set(
      likedReplyIds.map((like: any) => like.comment.toString()),
    );

    const repliesWithLikes = replies.map((reply: any) => {
      const replyId = reply._id.toString();
      const userLiked = likedReplyIdSet.has(replyId);

      return {
        _id: reply._id,
        text: reply.content,
        author: {
          _id: reply.author._id,
          username: reply.author.username || "Anonymous",
          avatar: reply.author.profilePic?.url || "",
          profilePic: reply.author.profilePic,
        },
        post: reply.post,
        parentComment: reply.parentComment,
        likes: reply.likesCount || 0,
        likedByCurrentUser: !!userLiked,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        replies: repliesWithLikes,
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
    console.error("getReplies error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
