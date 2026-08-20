import { Request, Response } from "express";
import mongoose from "mongoose";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import { Comment } from "../../../models/social/comment.model.js";
import { createNotification } from "../../../services/social/notification.service.js";

export const toggleLike = async (req: Request, res: Response) => {
  const { targetId, targetType } = req.body as {
    targetId: string;
    targetType: "post" | "comment";
  };
  const userId = req.user!.userId;

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const targetObjectId = new mongoose.Types.ObjectId(targetId);

    const target =
      targetType === "post"
        ? await Post.findOne({ _id: targetObjectId, isDeleted: false })
            .select("_id author likesCount")
            .lean()
        : await Comment.findOne({ _id: targetObjectId, isDeleted: false })
            .select("_id author likesCount")
            .lean();

    if (!target) {
      return res.status(404).json({
        success: false,
        message: `${targetType === "post" ? "Post" : "Comment"} not found`,
      });
    }

    const likeFilter =
      targetType === "post"
        ? { user: userObjectId, post: targetObjectId }
        : { user: userObjectId, comment: targetObjectId };
    const deletedLike = await Like.findOneAndDelete(likeFilter);
    let liked = false;
    let likeDelta = 0;

    if (deletedLike) {
      liked = false;
      likeDelta = -1;
    } else {
      try {
        await Like.create(likeFilter);
        liked = true;
        likeDelta = 1;
      } catch (error: unknown) {
        if (
          !(error instanceof Error && "code" in error && error.code === 11000)
        ) {
          throw error;
        }
        liked = true;
        likeDelta = 0;
      }
    }

    if (likeDelta === -1 && (target.likesCount || 0) <= 0) {
      likeDelta = 0;
    }

    if (likeDelta !== 0) {
      if (targetType === "post") {
        await Post.updateOne(
          { _id: targetObjectId },
          { $inc: { likesCount: likeDelta } },
        );
      } else {
        await Comment.updateOne(
          { _id: targetObjectId },
          { $inc: { likesCount: likeDelta } },
        );
      }
    }

    const likeCount = Math.max(0, (target.likesCount || 0) + likeDelta);
    const ownerId = target.author?.toString();
    if (liked && ownerId) {
      // createNotification never throws — a failure here can't take the
      // like itself down with it.
      await createNotification({
        recipient: ownerId,
        actor: userObjectId.toString(),
        type: "like",
        ...(targetType === "post"
          ? { post: targetObjectId.toString() }
          : { comment: targetObjectId.toString() }),
      });
    }

    return res.status(200).json({
      success: true,
      message: liked ? "Liked" : "Unliked",
      data: {
        liked,
        likeCount,
        likes: likeCount,
        targetId,
        targetType,
      },
    });
  } catch (error) {
    throw error;
  }
};
