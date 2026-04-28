// controllers/comment/getComments.ts
import { Request, Response } from "express";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";

export const getComments = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?.userId; // Optional for non-authenticated users
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
      .populate("author", "_id username avatar email")
      .lean();

    // Enrich comments with like data
    const commentsWithLikes = await Promise.all(
      comments.map(async (comment: any) => {
        const likeCount = await Like.countDocuments({
          comment: comment._id,
        });

        const userLiked = userId
          ? await Like.exists({
              comment: comment._id,
              user: userId,
            })
          : null;

        return {
          _id: comment._id,
          text: comment.content,
          author: {
            _id: comment.author._id,
            username: comment.author.username || "Anonymous",
            avatar: comment.author.avatar,
          },
          post: comment.post,
          likes: likeCount,
          likedByCurrentUser: !!userLiked,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        };
      }),
    );

    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      isDeleted: false,
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
    console.error("getComments error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
