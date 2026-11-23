import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../../models/social/post.model.js";
import type { PopulatedUserSummary } from "../../types/social.types.js";
import {
  hasPopulatedUserSummary,
  serializeLostFound,
  serializeUserSummary,
} from "../../utils/socialSerializers.js";
import { createNotification } from "../../services/social/notification.service.js";
import { broadcastNotification } from "../../services/social/notification.service.js";

/**
 * The review queue for events and announcements written by general
 * members (see utils/postModeration.ts for why only those two types
 * arrive here). Mirrors the pending-notes / pending-PYQs / pending-syllabus
 * endpoints next door, and sits behind the same roleMiddleware("mod",
 * "admin") the rest of mod.routes.ts applies.
 */

const PENDING_FILTER = { isDeleted: false, moderationStatus: "pending" };

export const fetchPendingPosts = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    Post.find(PENDING_FILTER)
      // Oldest first: a review queue is a queue, and the post that has
      // been waiting longest is the one to deal with next. (The public
      // feed sorts the other way, newest first.)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .select(
        "type content author media isAnonymous lostFound moderationStatus createdAt updatedAt",
      )
      .populate<{ author: PopulatedUserSummary | null }>(
        "author",
        "_id username profilePic role",
      )
      .lean(),
    Post.countDocuments(PENDING_FILTER),
  ]);

  const reviewablePosts = posts.filter((post) =>
    hasPopulatedUserSummary(post.author),
  );

  const formatted = reviewablePosts.map((post) => ({
    _id: post._id,
    type: post.type,
    content: post.content,
    // Deliberately NOT run through serializePostAuthor: reviewers see who
    // wrote an anonymous post. Approving content without knowing who
    // submitted it is exactly the wrong trade — anonymity is a shield from
    // other students, not from moderation. `isAnonymous` is passed
    // alongside so the queue can label it as such.
    author: serializeUserSummary(post.author as PopulatedUserSummary),
    isAnonymous: Boolean(post.isAnonymous),
    lostFound: serializeLostFound(post.lostFound),
    files: post.media?.map((m) => m.url) || [],
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }));

  return res.status(200).json({
    success: true,
    message: "Pending posts fetched successfully",
    data: {
      posts: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
  });
};

/**
 * Loads a post that is actually awaiting review.
 *
 * Filtering on `moderationStatus: "pending"` (rather than fetching by id
 * and checking after) makes the approve/reject endpoints idempotent-safe:
 * two moderators acting on the same post race to the same 404 instead of
 * the second one overwriting the first one's verdict.
 */
const findPendingPost = async (postId: string) => {
  if (!mongoose.isValidObjectId(postId)) return null;
  return Post.findOne({ _id: postId, ...PENDING_FILTER });
};

export const approvePost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const post = await findPendingPost(postId);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: "No pending post found for that ID.",
    });
  }

  post.moderationStatus = "approved";
  post.set({
    reviewedBy: req.user!.userId,
    reviewedAt: new Date(),
    rejectionReason: null,
  });
  await post.save();

  // Tell the author it's live. Non-fatal by design (see
  // notification.service.ts) — a notification hiccup must never leave the
  // post stuck unapproved.
  await createNotification({
    recipient: post.author.toString(),
    actor: req.user!.userId,
    type: "post_approved",
    post: post._id.toString(),
  });

  for (const mention of post.mentions || []) {
    await createNotification({
      recipient: mention.userId.toString(),
      actor: post.author.toString(),
      type: "mention_post",
      post: post._id.toString(),
    });
  }

  if (post.mentionEveryone) {
    await broadcastNotification({
      actor: post.author.toString(),
      type: "mention_post",
      post: post._id.toString(),
    });
  }

  return res.status(200).json({
    success: true,
    message: "Post approved and published.",
    data: { postId: post._id, moderationStatus: post.moderationStatus },
  });
};

export const rejectPost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { rejectionReason } = req.body as { rejectionReason: string };
  const post = await findPendingPost(postId);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: "No pending post found for that ID.",
    });
  }

  post.moderationStatus = "rejected";
  post.set({
    reviewedBy: req.user!.userId,
    reviewedAt: new Date(),
    rejectionReason,
  });
  await post.save();

  await createNotification({
    recipient: post.author.toString(),
    actor: req.user!.userId,
    type: "post_rejected",
    post: post._id.toString(),
  });

  return res.status(200).json({
    success: true,
    message: "Post rejected.",
    data: { postId: post._id, moderationStatus: post.moderationStatus },
  });
};
