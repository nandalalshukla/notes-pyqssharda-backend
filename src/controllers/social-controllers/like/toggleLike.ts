// controllers/like/toggleLike.ts
import { Request, Response } from "express";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import { Comment } from "../../../models/social/comment.model.js";
import { Notification } from "../../../models/social/notification.model.js";

export const toggleLike = async (req: Request, res: Response) => {
  const { targetId, targetType } = req.body; // targetType: "post" | "comment"
  const userId = req.user!.userId;

  if (!targetId || !targetType) {
    return res
      .status(400)
      .json({
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
    const filter =
      targetType === "post"
        ? { user: userId, post: targetId }
        : { user: userId, comment: targetId };

    const existing = await Like.findOne(filter);

    if (existing) {
      // Unlike
      await existing.deleteOne();
      await (targetType === "post"
        ? Post.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } })
        : Comment.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } }));

      return res
        .status(200)
        .json({ success: true, message: "Unliked", data: { liked: false } });
    }

    // Like
    await Like.create(filter);

    const target =
      targetType === "post"
        ? await Post.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } })
        : await Comment.findByIdAndUpdate(targetId, {
            $inc: { likesCount: 1 },
          });

    // Notify target owner (if not liking own content)
    const ownerId = target?.author?.toString();
    if (ownerId && ownerId !== userId) {
      await Notification.create({
        recipient: ownerId,
        actor: userId,
        type: "like",
        post: targetType === "post" ? targetId : null,
        comment: targetType === "comment" ? targetId : null,
      });
    }

    return res
      .status(200)
      .json({ success: true, message: "Liked", data: { liked: true } });
  } catch (err: any) {
    // Duplicate like (race condition)
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Already liked" });
    }
    console.error("toggleLike error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
