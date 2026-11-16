import type { Request, Response } from "express";
import { toggleLikeState } from "../../../services/social/like.service.js";

/**
 * Backward-compatible handler for older app builds. New clients should use
 * PUT /likes/state with an explicit desired state; a toggle cannot be made
 * safe against request retries because repeating it reverses the first call.
 */
export const toggleLike = async (req: Request, res: Response) => {
  const { targetId, targetType } = req.body as {
    targetId: string;
    targetType: "post" | "comment";
  };

  const result = await toggleLikeState(
    req.user!.userId,
    targetType,
    targetId,
  );

  return res.status(200).json({
    success: true,
    message: result.liked ? "Liked" : "Unliked",
    data: {
      liked: result.liked,
      likeCount: result.likeCount,
      likes: result.likeCount,
      targetId,
      targetType,
    },
  });
};
