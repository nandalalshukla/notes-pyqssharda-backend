import { Request, Response } from "express";
import mongoose from "mongoose";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import { Comment } from "../../../models/social/comment.model.js";
import { Notification } from "../../../models/social/notification.model.js";

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
        : await Comment.findOne({ _id: targetObjectId, isDeleted: false });

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
    const targetLikeFilter =
      targetType === "post"
        ? { post: targetObjectId }
        : { comment: targetObjectId };

    const deletedLike = await Like.findOneAndDelete(likeFilter);
    const liked = !deletedLike;

    if (liked) {
      try {
        await Like.create(likeFilter);
      } catch (error: unknown) {
        if (
          !(error instanceof Error && "code" in error && error.code === 11000)
        ) {
          throw error;
        }
      }
    }

    const likeCount = await Like.countDocuments(targetLikeFilter);
    const updatedTarget =
      targetType === "post"
        ? await Post.findByIdAndUpdate(
            targetObjectId,
            { $set: { likesCount: likeCount } },
            { new: true },
          )
        : await Comment.findByIdAndUpdate(
            targetObjectId,
            { $set: { likesCount: likeCount } },
            { new: true },
          );

    const ownerId = updatedTarget?.author?.toString();
    if (liked && ownerId && ownerId !== userObjectId.toString()) {
      await Notification.create({
        recipient: ownerId,
        actor: userObjectId,
        type: "like",
        ...(targetType === "post"
          ? { post: targetObjectId }
          : { comment: targetObjectId }),
      } as any);
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
    console.error("toggleLike error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
