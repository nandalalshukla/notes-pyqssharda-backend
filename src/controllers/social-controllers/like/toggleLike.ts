// controllers/like/toggleLike.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import { Comment } from "../../../models/social/comment.model.js";
import { Notification } from "../../../models/social/notification.model.js";

export const toggleLike = async (req: Request, res: Response) => {
  const { targetId, targetType } = req.body; // targetType: "post" | "comment"
  const userId = req.user!.userId;

  if (!targetId || !targetType) {
    return res.status(400).json({
      success: false,
      message: "targetId and targetType are required",
    });
  }

  if (!["post", "comment"].includes(targetType)) {
    return res
      .status(400)
      .json({ success: false, message: "targetType must be post or comment" });
  }

  try {
    // Ensure IDs are ObjectIds for proper comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const targetObjectId = new mongoose.Types.ObjectId(targetId);

    const filter =
      targetType === "post"
        ? { user: userObjectId, post: targetObjectId }
        : { user: userObjectId, comment: targetObjectId };

    const existing = await Like.findOne(filter);
    const targetLikeFilter =
      targetType === "post"
        ? { post: targetObjectId }
        : { comment: targetObjectId };

    if (existing) {
      // Unlike
      await existing.deleteOne();
      await (targetType === "post"
        ? Post.findByIdAndUpdate(targetObjectId, { $inc: { likesCount: -1 } })
        : Comment.findByIdAndUpdate(targetObjectId, {
            $inc: { likesCount: -1 },
          }));

      const actualLikeCount = await Like.countDocuments(targetLikeFilter);
      await (targetType === "post"
        ? Post.findByIdAndUpdate(targetObjectId, {
            $set: { likesCount: actualLikeCount },
          })
        : Comment.findByIdAndUpdate(targetObjectId, {
            $set: { likesCount: actualLikeCount },
          }));

      return res.status(200).json({
        success: true,
        message: "Unliked",
        data: {
          liked: false,
          likeCount: actualLikeCount,
          targetId,
          targetType,
        },
      });
    }

    // Like
    await Like.create(filter);

    const target =
      targetType === "post"
        ? await Post.findByIdAndUpdate(targetObjectId, {
            $inc: { likesCount: 1 },
          })
        : await Comment.findByIdAndUpdate(targetObjectId, {
            $inc: { likesCount: 1 },
          });

    const actualLikeCount = await Like.countDocuments(targetLikeFilter);
    await (targetType === "post"
      ? Post.findByIdAndUpdate(targetObjectId, {
          $set: { likesCount: actualLikeCount },
        })
      : Comment.findByIdAndUpdate(targetObjectId, {
          $set: { likesCount: actualLikeCount },
        }));

    // Notify target owner (if not liking own content)
    const ownerId = target?.author?.toString();
    if (ownerId && ownerId !== userObjectId.toString()) {
      await Notification.create({
        recipient: ownerId,
        actor: userObjectId,
        type: "like",
        post: targetType === "post" ? targetObjectId : null,
        comment: targetType === "comment" ? targetObjectId : null,
      } as any);
    }

    return res.status(200).json({
      success: true,
      message: "Liked",
      data: {
        liked: true,
        likeCount: actualLikeCount,
        targetId,
        targetType,
      },
    });
  } catch (err: unknown) {
    // Duplicate like (race condition) - return idempotent success response
    if (err instanceof Error && "code" in err && err.code === 11000) {
      const targetObjectId = new mongoose.Types.ObjectId(targetId);
      const targetLikeFilter =
        targetType === "post"
          ? { post: targetObjectId }
          : { comment: targetObjectId };

      const actualLikeCount = await Like.countDocuments(targetLikeFilter);
      await (targetType === "post"
        ? Post.findByIdAndUpdate(targetObjectId, {
            $set: { likesCount: actualLikeCount },
          })
        : Comment.findByIdAndUpdate(targetObjectId, {
            $set: { likesCount: actualLikeCount },
          }));

      return res.status(200).json({
        success: true,
        message: "Already liked",
        data: {
          liked: true,
          likeCount: actualLikeCount,
          targetId,
          targetType,
        },
      });
    }
    console.error("toggleLike error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
