import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import type { PopulatedUserSummary } from "../../../types/social.types.js";
import {
  hasPopulatedUserSummary,
  serializeUserSummary,
} from "../../../utils/socialSerializers.js";

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
        .populate<{ author: PopulatedUserSummary | null }>(
          "author",
          "_id username profilePic role",
        )
        .lean(),
      Comment.countDocuments({
        post: postId,
        parentComment: commentId,
        isDeleted: false,
      }),
    ]);

    type ReplyRow = (typeof replies)[number];

    const orphanedReplyIds = replies
      .filter((reply) => !hasPopulatedUserSummary(reply.author))
      .map((reply) => reply._id);
    const visibleReplies = replies.filter(
      (reply): reply is ReplyRow & { author: PopulatedUserSummary } =>
        hasPopulatedUserSummary(reply.author),
    );

    if (orphanedReplyIds.length > 0) {
      await Promise.all([
        Comment.updateMany(
          { _id: { $in: orphanedReplyIds } },
          { $set: { isDeleted: true } },
        ),
        Like.deleteMany({ comment: { $in: orphanedReplyIds } }),
        Post.updateOne(
          { _id: postId },
          { $inc: { commentsCount: -orphanedReplyIds.length } },
        ),
      ]);
    }

    const replyIds = visibleReplies.map((reply) => reply._id);
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const likedReplyIds =
      userObjectId && replyIds.length > 0
        ? await Like.find({ user: userObjectId, comment: { $in: replyIds } })
            .select("comment")
            .lean()
        : [];
    const likedReplyIdSet = new Set(
      likedReplyIds.map((like) => like.comment!.toString()),
    );

    const repliesWithLikes = visibleReplies.map((reply) => {
      const replyId = reply._id.toString();
      const userLiked = likedReplyIdSet.has(replyId);

      return {
        _id: reply._id,
        text: reply.content,
        author: serializeUserSummary(reply.author),
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
    throw err;
  }
};
