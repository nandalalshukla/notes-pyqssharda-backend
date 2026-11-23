// controllers/comment/getComments.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import type { PopulatedUserSummary } from "../../../types/social.types.js";
import {
  hasPopulatedUserSummary,
  serializeUserSummary,
  serializeMentions,
} from "../../../utils/socialSerializers.js";

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
        .select("content author post likesCount mentions mentionEveryone createdAt updatedAt")
        .populate<{ author: PopulatedUserSummary | null }>(
          "author",
          "_id username profilePic role",
        )
        .populate({
          path: "mentions.userId",
          select: "_id username isActive",
          match: { isActive: true },
        })
        .lean(),
      Comment.countDocuments({
        post: postId,
        parentComment: null,
        isDeleted: false,
      }),
    ]);

    type CommentRow = (typeof comments)[number];

    const orphanedCommentIds = comments
      .filter((comment) => !hasPopulatedUserSummary(comment.author))
      .map((comment) => comment._id);
    const visibleComments = comments.filter(
      (comment): comment is CommentRow & { author: PopulatedUserSummary } =>
        hasPopulatedUserSummary(comment.author),
    );

    if (orphanedCommentIds.length > 0) {
      await Promise.all([
        Comment.updateMany(
          { _id: { $in: orphanedCommentIds } },
          { $set: { isDeleted: true } },
        ),
        Like.deleteMany({ comment: { $in: orphanedCommentIds } }),
        Post.updateOne(
          { _id: postId },
          { $inc: { commentsCount: -orphanedCommentIds.length } },
        ),
      ]);
    }

    const commentIds = visibleComments.map((comment) => comment._id);
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const likedCommentIds =
      userObjectId && commentIds.length > 0
        ? await Like.find({ user: userObjectId, comment: { $in: commentIds } })
            .select("comment")
            .lean()
        : [];
    const likedCommentIdSet = new Set(
      likedCommentIds.map((like) => like.comment!.toString()),
    );

    const commentsWithLikes = visibleComments.map((comment) => {
      const commentId = comment._id.toString();
      const userLiked = likedCommentIdSet.has(commentId);

      return {
        _id: comment._id,
        text: comment.content,
        mentions: serializeMentions(comment.mentions as never),
        mentionEveryone: Boolean(comment.mentionEveryone),
        author: serializeUserSummary(comment.author),
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
