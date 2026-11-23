// controllers/post/getPost.ts
import { Request, Response } from "express";
import { Post } from "../../../models/social/post.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Follow } from "../../../models/social/follow.model.js";
import mongoose from "mongoose";
import type { PopulatedUserSummary } from "../../../types/social.types.js";
import {
  hasPopulatedUserSummary,
  serializeLostFound,
  serializePostAuthor,
  serializeMentions,
} from "../../../utils/socialSerializers.js";
import { isPostReviewer } from "../../../utils/postModeration.js";

export const getPost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?.userId; // Optional - handle both authenticated and non-authenticated users

  // Validate postId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid post ID",
    });
  }

  try {
    const post = await Post.findOne({
      _id: postId,
      isDeleted: false,
    })
      .select(
        "type content author media likesCount commentsCount isAnonymous lostFound moderationStatus rejectionReason mentions createdAt updatedAt",
      )
      .populate({
        path: "mentions.userId",
        select: "_id username isActive",
        match: { isActive: true },
      })
      .populate<{ author: PopulatedUserSummary | null }>(
        "author",
        "_id username profilePic role",
      )
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (!hasPopulatedUserSummary(post.author)) {
      await Post.updateOne({ _id: post._id }, { $set: { isDeleted: true } });
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // A post still in (or refused by) review is readable by its author and
    // by the staff who review it — to everyone else it doesn't exist yet,
    // and says so with a 404 rather than a 403, which would confirm that
    // something is there.
    const isPending = (post.moderationStatus || "approved") !== "approved";
    const viewerIsAuthor =
      Boolean(userId) && String(userId) === post.author._id.toString();
    if (isPending && !viewerIsAuthor && !isPostReviewer(req.user?.userRole)) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const [userLike, isFollowing] = await Promise.all([
      userObjectId
        ? Like.findOne({ user: userObjectId, post: postId }).lean()
        : Promise.resolve(null),
      // Skipped for anonymous posts — see the matching note in
      // getFeedPosts.ts: probing follow state for a hidden author leaks
      // information about who they are.
      userObjectId && !post.isAnonymous
        ? Follow.findOne({
            follower: userObjectId,
            following: post.author._id,
          }).lean()
        : Promise.resolve(null),
    ]);

    const files = post.media?.map((m) => m.url) || [];
    const publicIds = post.media?.map((m) => m.publicId) || [];

    const postData = {
      _id: post._id,
      type: post.type || "general",
      content: post.content,
      mentions: serializeMentions(post.mentions as never),
      author: serializePostAuthor(post.author, {
        isAnonymous: post.isAnonymous,
        viewerId: userId,
        isFollowedByCurrentUser: !!isFollowing,
      }),
      isAnonymous: Boolean(post.isAnonymous),
      moderationStatus: post.moderationStatus || "approved",
      rejectionReason: viewerIsAuthor ? (post.rejectionReason ?? null) : null,
      lostFound: serializeLostFound(post.lostFound),
      files,
      publicIds,
      likes: post.likesCount || 0,
      likedByCurrentUser: !!userLike,
      commentCount: post.commentsCount || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: {
        post: postData,
      },
    });
  } catch (err) {
    throw err;
  }
};
