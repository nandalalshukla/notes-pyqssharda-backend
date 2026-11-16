import type { Request, Response } from "express";
import { setLikeState } from "../../../services/social/like.service.js";

export const setLikeStateController = async (req: Request, res: Response) => {
  const { targetId, targetType, liked } = req.body as {
    targetId: string;
    targetType: "post" | "comment";
    liked: boolean;
  };

  const result = await setLikeState(
    req.user!.userId,
    targetType,
    targetId,
    liked,
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
