// controllers/feed/getFeed.ts
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

export const getFeed = async (req: Request, res: Response) => {
  const userId = req.user?.userId; // Optional - handle both authenticated and non-authenticated users
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const type = req.query.type as string | undefined;
  const lostFoundStatus = req.query.lostFoundStatus as string | undefined;
  const skip = (page - 1) * limit;
  const requestedType =
    type === "event" ||
    type === "announcement" ||
    type === "opportunity" ||
    type === "lost_found"
      ? type
      : undefined;
  // Only meaningful on the lost & found board — a status filter on the
  // general feed would silently drop every post that has no `lostFound`.
  const requestedLostFoundStatus =
    requestedType === "lost_found" &&
    (lostFoundStatus === "open" || lostFoundStatus === "resolved")
      ? lostFoundStatus
      : undefined;
  const viewerObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;
  const postFilter = {
    isDeleted: false,
    ...(requestedType ? { type: requestedType } : {}),
    ...(requestedLostFoundStatus
      ? { "lostFound.status": requestedLostFoundStatus }
      : {}),
    // Posts awaiting (or refused) review are invisible to everyone except
    // their own author, who keeps seeing theirs in place with a status
    // banner — otherwise submitting an announcement would look exactly
    // like the post silently vanishing.
    ...(viewerObjectId
      ? {
          $or: [
            { moderationStatus: "approved" },
            { author: viewerObjectId },
          ],
        }
      : { moderationStatus: "approved" }),
  };

  try {
    const [posts, total] = await Promise.all([
      Post.find(postFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "type content author media likesCount commentsCount isAnonymous lostFound moderationStatus rejectionReason mentions mentionEveryone createdAt updatedAt",
        )
        .populate<{ author: PopulatedUserSummary | null }>(
          "author",
          "_id username profilePic role",
        )
        .populate({
          path: "mentions.userId",
          select: "_id username isActive",
          match: { isActive: true },
        })
        .lean(),
      Post.countDocuments(postFilter),
    ]);

    type FeedPost = (typeof posts)[number];

    const orphanedPostIds = posts
      .filter((post) => !hasPopulatedUserSummary(post.author))
      .map((post) => post._id);
    const visiblePosts = posts.filter(
      (post): post is FeedPost & { author: PopulatedUserSummary } =>
        hasPopulatedUserSummary(post.author),
    );

    if (orphanedPostIds.length > 0) {
      await Post.updateMany(
        { _id: { $in: orphanedPostIds } },
        { $set: { isDeleted: true } },
      );
    }

    const postIds = visiblePosts.map((post) => post._id);
    const userObjectId = viewerObjectId;

    const [likedPostIds, followedAuthors] = await Promise.all([
      userObjectId && postIds.length > 0
        ? Like.find({ user: userObjectId, post: { $in: postIds } })
            .select("post")
            .lean()
        : Promise.resolve([]),
      userObjectId && postIds.length > 0
        ? Follow.find({
            follower: userObjectId,
            // Anonymous posts are excluded from this lookup on purpose: a
            // follow-state probe for their author is a side channel that
            // would narrow down who wrote them.
            following: {
              $in: visiblePosts
                .filter((post) => !post.isAnonymous)
                .map((post) => post.author._id),
            },
          })
            .select("following")
            .lean()
        : Promise.resolve([]),
    ]);

    const likedPostIdSet = new Set(
      likedPostIds.map((like) => like.post!.toString()),
    );
    const followedAuthorIdSet = new Set(
      followedAuthors.map((follow) => follow.following!.toString()),
    );

    const postsWithEngagement = visiblePosts.map((post) => {
      const postId = post._id.toString();

      // Transform media to match frontend expectations
      const files = post.media?.map((m) => m.url) || [];
      const publicIds = post.media?.map((m) => m.publicId) || [];

      return {
        _id: post._id,
        type: post.type || "general",
        content: post.content,
        mentions: serializeMentions(post.mentions as never),
        mentionEveryone: Boolean(post.mentionEveryone),
        author: serializePostAuthor(post.author, {
          isAnonymous: post.isAnonymous,
          viewerId: userId,
          isFollowedByCurrentUser: followedAuthorIdSet.has(
            post.author._id.toString(),
          ),
        }),
        isAnonymous: Boolean(post.isAnonymous),
        moderationStatus: post.moderationStatus || "approved",
        // Only ever reaches the author — nobody else receives an
        // unapproved post in the first place.
        rejectionReason: post.rejectionReason ?? null,
        lostFound: serializeLostFound(post.lostFound),
        files,
        publicIds,
        likes: post.likesCount || 0,
        likedByCurrentUser: likedPostIdSet.has(postId),
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
