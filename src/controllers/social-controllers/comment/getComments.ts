// controllers/comment/getComments.ts
import { Request, Response } from "express";
import { Comment } from "../../../models/social/comment.model.js";

export const getComments = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    // Only fetch top-level comments — replies are fetched separately
    const comments = await Comment.find({
      post: postId,
      parentComment: null,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name username profilePic");

    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        comments,
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
    console.error("getComments error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
