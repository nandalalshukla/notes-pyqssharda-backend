import mongoose from "mongoose";
import { Comment } from "../../models/social/comment.model.js";
import { Follow } from "../../models/social/follow.model.js";
import { Like } from "../../models/social/like.model.js";
import { Notification } from "../../models/social/notification.model.js";
import { Post } from "../../models/social/post.model.js";
import { Report } from "../../models/social/report.model.js";
import { User } from "../../models/users/user.model.js";
import { Note } from "../../models/notes/notes.model.js";
import { Pyq } from "../../models/pyqs/pyq.model.js";
import { Syllabus } from "../../models/syllabus/syllabus.model.js";

type CommentRef = {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
};

function groupCountById(ids: mongoose.Types.ObjectId[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const key = id.toString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

async function getCommentDescendants(
  rootCommentIds: mongoose.Types.ObjectId[],
): Promise<CommentRef[]> {
  const descendants: CommentRef[] = [];
  let parentIds = rootCommentIds;

  while (parentIds.length > 0) {
    const children = await Comment.find({
      parentComment: { $in: parentIds },
      isDeleted: false,
    })
      .select("_id post")
      .lean<CommentRef[]>();

    descendants.push(...children);
    parentIds = children.map((child) => child._id);
  }

  return descendants;
}

async function decrementPostLikeCounts(postIds: mongoose.Types.ObjectId[]) {
  for (const [postId, count] of groupCountById(postIds)) {
    await Post.updateOne(
      { _id: postId, isDeleted: false },
      { $inc: { likesCount: -count } },
    );
  }
}

async function decrementCommentLikeCounts(commentIds: mongoose.Types.ObjectId[]) {
  for (const [commentId, count] of groupCountById(commentIds)) {
    await Comment.updateOne(
      { _id: commentId, isDeleted: false },
      { $inc: { likesCount: -count } },
    );
  }
}

async function decrementCommentCounts(comments: CommentRef[]) {
  const postIds = comments.map((comment) => comment.post);
  for (const [postId, count] of groupCountById(postIds)) {
    await Post.updateOne(
      { _id: postId, isDeleted: false },
      { $inc: { commentsCount: -count } },
    );
  }
}

type CleanupAccountReferencesOptions = {
  deleteReports?: boolean;
};

export async function cleanupAccountReferences(
  userId: string,
  { deleteReports = true }: CleanupAccountReferencesOptions = {},
): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [authoredPosts, authoredComments, userLikes, following, followers] =
    await Promise.all([
      Post.find({ author: userObjectId, isDeleted: false })
        .select("_id")
        .lean<{ _id: mongoose.Types.ObjectId }[]>(),
      Comment.find({ author: userObjectId, isDeleted: false })
        .select("_id post")
        .lean<CommentRef[]>(),
      Like.find({ user: userObjectId })
        .select("post comment")
        .lean<{
          post?: mongoose.Types.ObjectId;
          comment?: mongoose.Types.ObjectId;
        }[]>(),
      Follow.find({ follower: userObjectId })
        .select("following")
        .lean<{ following: mongoose.Types.ObjectId }[]>(),
      Follow.find({ following: userObjectId })
        .select("follower")
        .lean<{ follower: mongoose.Types.ObjectId }[]>(),
    ]);

  const authoredPostIds = authoredPosts.map((post) => post._id);
  const authoredPostIdSet = new Set(authoredPostIds.map((id) => id.toString()));
  const descendants = await getCommentDescendants(
    authoredComments.map((comment) => comment._id),
  );
  const commentsToDelete = [...authoredComments, ...descendants].filter(
    (comment, index, comments) =>
      comments.findIndex((item) => item._id.equals(comment._id)) === index,
  );
  const commentIdsToDelete = commentsToDelete.map((comment) => comment._id);
  const commentIdToDeleteSet = new Set(
    commentIdsToDelete.map((id) => id.toString()),
  );

  const postLikesToDecrement = userLikes
    .map((like) => like.post)
    .filter(
      (postId): postId is mongoose.Types.ObjectId =>
        postId !== undefined && !authoredPostIdSet.has(postId.toString()),
    );
  const commentLikesToDecrement = userLikes
    .map((like) => like.comment)
    .filter(
      (commentId): commentId is mongoose.Types.ObjectId =>
        commentId !== undefined &&
        !commentIdToDeleteSet.has(commentId.toString()),
    );
  const commentsOnSurvivingPosts = commentsToDelete.filter(
    (comment) => !authoredPostIdSet.has(comment.post.toString()),
  );

  await Promise.all([
    decrementPostLikeCounts(postLikesToDecrement),
    decrementCommentLikeCounts(commentLikesToDecrement),
    decrementCommentCounts(commentsOnSurvivingPosts),
    following.length > 0
      ? User.updateMany(
          { _id: { $in: following.map((follow) => follow.following) } },
          { $inc: { followersCount: -1 } },
        )
      : Promise.resolve(),
    followers.length > 0
      ? User.updateMany(
          { _id: { $in: followers.map((follow) => follow.follower) } },
          { $inc: { followingCount: -1 } },
        )
      : Promise.resolve(),
  ]);

  await Promise.all([
    authoredPostIds.length > 0
      ? Post.updateMany(
          { _id: { $in: authoredPostIds } },
          { $set: { isDeleted: true, likesCount: 0, commentsCount: 0 } },
        )
      : Promise.resolve(),
    commentIdsToDelete.length > 0
      ? Comment.updateMany(
          { _id: { $in: commentIdsToDelete } },
          { $set: { isDeleted: true, likesCount: 0 } },
        )
      : Promise.resolve(),
    Like.deleteMany({
      $or: [
        { user: userObjectId },
        ...(authoredPostIds.length > 0
          ? [{ post: { $in: authoredPostIds } }]
          : []),
        ...(commentIdsToDelete.length > 0
          ? [{ comment: { $in: commentIdsToDelete } }]
          : []),
      ],
    }),
    Follow.deleteMany({
      $or: [{ follower: userObjectId }, { following: userObjectId }],
    }),
    Notification.deleteMany({
      $or: [
        { recipient: userObjectId },
        { actor: userObjectId },
        ...(authoredPostIds.length > 0
          ? [{ post: { $in: authoredPostIds } }]
          : []),
        ...(commentIdsToDelete.length > 0
          ? [{ comment: { $in: commentIdsToDelete } }]
          : []),
      ],
    }),
    deleteReports
      ? Report.deleteMany({
          $or: [
            { reporter: userObjectId },
            { targetOwner: userObjectId },
            { targetType: "user", targetId: userObjectId },
            ...(authoredPostIds.length > 0
              ? [{ targetType: "post", targetId: { $in: authoredPostIds } }]
              : []),
            ...(commentIdsToDelete.length > 0
              ? [
                  {
                    targetType: "comment",
                    targetId: { $in: commentIdsToDelete },
                  },
                ]
              : []),
          ],
        })
      : Promise.resolve(),
    Note.deleteMany({ userId: userObjectId }),
    Pyq.deleteMany({ userId: userObjectId }),
    Syllabus.deleteMany({ userId: userObjectId }),
  ]);
}
