import mongoose from "mongoose";
import type { ClientSession, Types } from "mongoose";
import { Comment } from "../../models/social/comment.model.js";
import { Like } from "../../models/social/like.model.js";
import { Post } from "../../models/social/post.model.js";
import { createNotification } from "./notification.service.js";
import { NotFoundError } from "../../utils/errors/AppError.js";

export type LikeTargetType = "post" | "comment";

interface LikeMutation {
  liked: boolean;
  changed: boolean;
  likesCount: number;
  ownerId?: string;
}

const MAX_DUPLICATE_KEY_RETRIES = 3;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

async function withLikeTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_DUPLICATE_KEY_RETRIES; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        // withTransaction may re-run this callback for transient transaction
        // errors. Keep this callback limited to database work; notifications
        // and other external side effects happen only after commit.
        result = await operation(session);
      });
      return result;
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt === MAX_DUPLICATE_KEY_RETRIES - 1) {
        throw error;
      }

      // A concurrent upsert of the same unique like can produce E11000,
      // which MongoDB 8.1+ does not automatically retry inside a transaction.
      // Retry with a new snapshot; the next attempt will observe the winner.
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    } finally {
      await session.endSession();
    }
  }

  throw new Error("Like update could not be completed");
}

function targetFilter(targetType: LikeTargetType, targetId: Types.ObjectId) {
  return targetType === "post"
    ? { _id: targetId, isDeleted: false, moderationStatus: "approved" }
    : { _id: targetId, isDeleted: false };
}

async function findTarget(
  targetType: LikeTargetType,
  targetId: Types.ObjectId,
  session: ClientSession,
) {
  const filter = targetFilter(targetType, targetId);
  return targetType === "post"
    ? Post.findOne(filter).select("_id author likesCount").session(session).lean()
    : Comment.findOne(filter).select("_id author likesCount").session(session).lean();
}

function makeLikeFilter(
  userId: Types.ObjectId,
  targetType: LikeTargetType,
  targetId: Types.ObjectId,
) {
  return targetType === "post"
    ? { user: userId, post: targetId }
    : { user: userId, comment: targetId };
}

async function changeTargetCount(
  targetType: LikeTargetType,
  targetId: Types.ObjectId,
  delta: 1 | -1,
  session: ClientSession,
): Promise<number | null> {
  // The counter is a cache of Like rows. Clamp unlikes at zero so one legacy
  // drifted counter cannot become negative while we repair it over time.
  const update = [
    {
      $set: {
        likesCount: {
          $max: [
            0,
            { $add: [{ $ifNull: ["$likesCount", 0] }, delta] },
          ],
        },
      },
    },
  ];
  const options = { new: true, session };
  const filter = targetFilter(targetType, targetId);

  const updated =
    targetType === "post"
      ? await Post.findOneAndUpdate(filter, update, options)
          .select("likesCount")
          .lean()
      : await Comment.findOneAndUpdate(filter, update, options)
          .select("likesCount")
          .lean();

  return updated?.likesCount ?? null;
}

async function readCurrentCount(
  targetType: LikeTargetType,
  targetId: Types.ObjectId,
): Promise<number | undefined> {
  const current =
    targetType === "post"
      ? await Post.findById(targetId).select("likesCount").lean()
      : await Comment.findById(targetId).select("likesCount").lean();
  return current?.likesCount;
}

async function mutateLike(
  userId: string,
  targetType: LikeTargetType,
  targetId: string,
  desiredState: boolean | "toggle",
): Promise<{ liked: boolean; likeCount: number }> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const targetObjectId = new mongoose.Types.ObjectId(targetId);
  const now = new Date();

  const mutation = await withLikeTransaction(async (session): Promise<LikeMutation> => {
    const target = await findTarget(targetType, targetObjectId, session);
    if (!target) {
      throw new NotFoundError(targetType === "post" ? "Post" : "Comment");
    }

    const likeFilter = makeLikeFilter(userObjectId, targetType, targetObjectId);
    const existingLike = await Like.exists(likeFilter).session(session);
    const liked =
      desiredState === "toggle" ? !existingLike : desiredState;

    let changed = false;
    if (liked) {
      const setOnInsert =
        targetType === "post"
          ? { user: userObjectId, post: targetObjectId, createdAt: now, updatedAt: now }
          : { user: userObjectId, comment: targetObjectId, createdAt: now, updatedAt: now };
      const result = await Like.updateOne(
        likeFilter,
        { $setOnInsert: setOnInsert },
        { upsert: true, session, timestamps: false },
      );
      changed = result.upsertedCount === 1;
    } else {
      const result = await Like.deleteOne(likeFilter, { session });
      changed = result.deletedCount === 1;
    }

    let likesCount = target.likesCount ?? 0;
    if (changed) {
      const updatedCount = await changeTargetCount(
        targetType,
        targetObjectId,
        liked ? 1 : -1,
        session,
      );
      if (updatedCount === null) {
        throw new NotFoundError(targetType === "post" ? "Post" : "Comment");
      }
      likesCount = updatedCount;
    }

    return {
      liked,
      changed,
      likesCount,
      ownerId: target.author?.toString(),
    };
  });

  // Notifications are a side effect of the false -> true transition only.
  // Retrying the same desired state is a no-op and must not refresh/spam it.
  if (mutation.changed && mutation.liked && mutation.ownerId) {
    await createNotification({
      recipient: mutation.ownerId,
      actor: userObjectId.toString(),
      type: "like",
      ...(targetType === "post"
        ? { post: targetObjectId.toString() }
        : { comment: targetObjectId.toString() }),
    });
  }

  // A no-op doesn't write the target document, so read the cached count after
  // commit to avoid returning an older transaction snapshot when other users
  // liked/unliked concurrently.
  const currentCount = await readCurrentCount(targetType, targetObjectId);
  return {
    liked: mutation.liked,
    likeCount: currentCount ?? mutation.likesCount,
  };
}

export const setLikeState = (
  userId: string,
  targetType: LikeTargetType,
  targetId: string,
  liked: boolean,
) => mutateLike(userId, targetType, targetId, liked);

/** Compatibility for clients that still call POST /likes/toggle. */
export const toggleLikeState = (
  userId: string,
  targetType: LikeTargetType,
  targetId: string,
) => mutateLike(userId, targetType, targetId, "toggle");
