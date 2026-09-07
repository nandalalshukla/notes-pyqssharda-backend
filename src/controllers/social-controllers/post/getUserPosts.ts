import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../../../models/social/post.model.js";
import { User } from "../../../models/users/user.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Follow } from "../../../models/social/follow.model.js";
import type { PopulatedUserSummary } from "../../../types/social.types.js";
import {
  hasPopulatedUserSummary,
  serializeLostFound,
  serializePostAuthor,
} from "../../../utils/socialSerializers.js";

export const getUserPosts = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const currentUserId = req.user?.userId;

  try {
    const user = await User.findById(userId).select("_id +isActive");
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // A profile page is a list of "posts by this person" — so listing
    // someone's anonymous posts there would deanonymize every one of them
    // at a glance. They stay in the query only for the owner's own
    // profile, where they're already attributable and the owner needs a
    // place to manage them from.
    const isOwnProfile =
      Boolean(currentUserId) && String(currentUserId) === String(userId);
    const postFilter = {
      author: userId,
      isDeleted: false,
      // Same two exclusions as everywhere else, both lifted on your own
      // profile: anonymous posts (listing them here would attribute them)
      // and posts still awaiting review.
      ...(isOwnProfile
        ? {}
        : { isAnonymous: { $ne: true }, moderationStatus: "approved" }),
    };

    const [posts, total] = await Promise.all([
      Post.find(postFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "type content author media likesCount commentsCount isAnonymous lostFound moderationStatus rejectionReason createdAt updatedAt",
        )
        .populate<{ author: PopulatedUserSummary | null }>(
          "author",
          "_id username profilePic role",
        )
        .lean(),
      Post.countDocuments(postFilter),
    ]);

    type UserPost = (typeof posts)[number];

    const orphanedPostIds = posts
      .filter((post) => !hasPopulatedUserSummary(post.author))
      .map((post) => post._id);
    const visiblePosts = posts.filter(
      (post): post is UserPost & { author: PopulatedUserSummary } =>
        hasPopulatedUserSummary(post.author),
    );

    if (orphanedPostIds.length > 0) {
      await Post.updateMany(
        { _id: { $in: orphanedPostIds } },
        { $set: { isDeleted: true } },
      );
    }

    const postIds = visiblePosts.map((post) => post._id);
    const userObjectId = currentUserId
      ? new mongoose.Types.ObjectId(currentUserId)
      : null;

    const likedPostIds =
      userObjectId && postIds.length > 0
        ? await Like.find({ user: userObjectId, post: { $in: postIds } })
            .select("post")
            .lean()
        : [];
    const likedPostIdSet = new Set(
      likedPostIds.map((like) => like.post!.toString()),
    );

    const isFollowedByCurrentUser =
      userObjectId && currentUserId !== userId
        ? !!(await Follow.exists({
            follower: userObjectId,
            following: userId,
          }))
        : false;

    const postsWithEngagement = visiblePosts.map((post) => {
      const postId = post._id.toString();
      const userLiked = likedPostIdSet.has(postId);

      const files = post.media?.map((m) => m.url) || [];
      const publicIds = post.media?.map((m) => m.publicId) || [];

      return {
        _id: post._id,
        type: post.type || "general",
        content: post.content,
        author: serializePostAuthor(post.author, {
          isAnonymous: post.isAnonymous,
          viewerId: currentUserId,
          isFollowedByCurrentUser,
        }),
        isAnonymous: Boolean(post.isAnonymous),
        moderationStatus: post.moderationStatus || "approved",
        rejectionReason: isOwnProfile ? (post.rejectionReason ?? null) : null,
        lostFound: serializeLostFound(post.lostFound),
        files,
        publicIds,
        likes: post.likesCount || 0,
        likedByCurrentUser: !!userLiked,
        commentCount: post.commentsCount || 0,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        data: postsWithEngagement,
        totalPages,
        currentPage: page,
        total,
      },
    });
  } catch (err) {
    throw err;
  }
};
