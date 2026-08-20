import { NextFunction, Request, Response, Router } from "express";

// Controllers - Posts
import { createPost } from "../../controllers/social-controllers/post/createPost.js";
import { editPost } from "../../controllers/social-controllers/post/editPost.js";
import { deletePost } from "../../controllers/social-controllers/post/deletePost.js";
import { getFeed } from "../../controllers/social-controllers/post/getFeedPosts.js";
import { getUserPosts } from "../../controllers/social-controllers/post/getUserPosts.js";
import { getPost } from "../../controllers/social-controllers/post/getPost.js";

// Controllers - Comments
import { createComment } from "../../controllers/social-controllers/comment/createComment.js";
import { editComment } from "../../controllers/social-controllers/comment/editComment.js";
import { deleteComment } from "../../controllers/social-controllers/comment/deleteComment.js";
import { getComments } from "../../controllers/social-controllers/comment/getComments.js";
import { getReplies } from "../../controllers/social-controllers/comment/getReplies.js";
import { getComment } from "../../controllers/social-controllers/comment/getComment.js";

// Controllers - Likes
import { toggleLike } from "../../controllers/social-controllers/like/toggleLike.js";
import { getLikes } from "../../controllers/social-controllers/like/getLikes.js";

// Controllers - Follow
import { toggleFollow } from "../../controllers/social-controllers/follow/toggleFollow.js";
import { getFollowers } from "../../controllers/social-controllers/follow/getFollowers.js";
import { getFollowing } from "../../controllers/social-controllers/follow/getFollowing.js";
import { getProfile } from "../../controllers/social-controllers/getProfile.js";

// Controllers - Notifications
import { getNotifications } from "../../controllers/social-controllers/notification/getNotifications.js";
import { getUnreadCount } from "../../controllers/social-controllers/notification/getUnreadCount.js";
import {
  markAllAsRead,
  markOneAsRead,
  deleteNotification,
} from "../../controllers/social-controllers/notification/markAsRead.js";
import { streamNotifications } from "../../controllers/social-controllers/notification/streamNotifications.js";

// Controllers - Reports
import { createReportController } from "../../controllers/social-controllers/report/createReport.js";

// Validators
import {
  createPostSchema,
  editPostSchema,
  postParamsSchema,
} from "../../validators/social-zod/post.zod.js";
import {
  createCommentSchema,
  editCommentSchema,
  commentParamsSchema,
} from "../../validators/social-zod/comment.zod.js";
import { likeActionSchema } from "../../validators/social-zod/like.zod.js";
import {
  followActionSchema,
  followListSchema,
} from "../../validators/social-zod/follow.zod.js";
import {
  notificationParamsSchema,
  getNotificationsSchema,
} from "../../validators/social-zod/notification.zod.js";
import { createReportSchema } from "../../validators/social-zod/report.zod.js";
import {
  interactionLimiter,
  postCreationLimiter,
  uploadLimiter,
  cooldown,
  reportLimiter,
  notificationLimiter,
  notificationStreamLimiter,
} from "../../middlewares/rateLimit/index.js";
import { clampPagination } from "../../middlewares/security/pagination.middleware.js";

// Middlewares & Multer
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../../middlewares/auth/auth.middleware.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";
import { uploadPostFilesMulter } from "../../config/multer.js";

const router = Router();

const uploadPostFiles = (req: Request, res: Response, next: NextFunction) => {
  uploadPostFilesMulter.array("files")(req, res, (error: unknown) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload post files.",
      });
    }

    next();
  });
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PUBLIC ROUTES (No Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Get feed (paginated) - Public route so anyone can browse posts
router.get(
  "/feed",
  optionalAuthMiddleware,
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  getFeed,
);

// Get a single post - Public route
router.get(
  "/posts/:postId",
  optionalAuthMiddleware,
  interactionLimiter,
  getPost,
);

// Get all comments for a post - Public route
router.get(
  "/posts/:postId/comments",
  optionalAuthMiddleware,
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  getComments,
);

// Get a single comment for a post - Public route
router.get(
  "/posts/:postId/comments/:commentId",
  optionalAuthMiddleware,
  interactionLimiter,
  getComment,
);

// Get replies for a comment - Public route
router.get(
  "/posts/:postId/comments/:commentId/replies",
  optionalAuthMiddleware,
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  getReplies,
);

// Get user profile - Public route
router.get(
  "/users/:userId",
  optionalAuthMiddleware,
  interactionLimiter,
  getProfile,
);

// Get user's posts (for profile page) - Public route
router.get(
  "/users/:userId/posts",
  optionalAuthMiddleware,
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  getUserPosts,
);

// Get user's followers (paginated) - Public route
router.get(
  "/users/:userId/followers",
  validateMiddleware(followListSchema),
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  getFollowers,
);

// Get user's following (paginated) - Public route
router.get(
  "/users/:userId/following",
  validateMiddleware(followListSchema),
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  getFollowing,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROTECTED ROUTES (Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * POSTS MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

// Create new post with file uploads
router.post(
  "/posts",
  authMiddleware,
  postCreationLimiter,
  uploadLimiter,
  cooldown({ windowMs: 5000, message: "Please wait before posting again." }),
  uploadPostFiles,
  validateMiddleware(createPostSchema),
  createPost,
);

// Update post
router.patch(
  "/posts/:postId",
  authMiddleware,
  uploadLimiter,
  cooldown({ windowMs: 5000, message: "Please wait before updating again." }),
  uploadPostFiles,
  validateMiddleware(editPostSchema),
  editPost,
);

// Delete post
router.delete(
  "/posts/:postId",
  authMiddleware,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(postParamsSchema),
  deletePost,
);

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * COMMENTS MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

// Create comment
router.post(
  "/posts/:postId/comments",
  authMiddleware,
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before commenting again." }),
  validateMiddleware(createCommentSchema),
  createComment,
);

// Edit comment
router.patch(
  "/posts/:postId/comments/:commentId",
  authMiddleware,
  cooldown({ windowMs: 3000, message: "Please wait before updating again." }),
  validateMiddleware(editCommentSchema),
  editComment,
);

// Delete comment
router.delete(
  "/posts/:postId/comments/:commentId",
  authMiddleware,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(commentParamsSchema),
  deleteComment,
);

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * LIKES MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

// Toggle like on post/comment
router.post(
  "/likes/toggle",
  authMiddleware,
  interactionLimiter,
  cooldown({ windowMs: 1000, message: "Please wait before liking again." }),
  validateMiddleware(likeActionSchema),
  toggleLike,
);

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * REPORTS MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

router.post(
  "/reports",
  authMiddleware,
  reportLimiter({ windowMs: 60000, maxReportsPerWindow: 3 }),
  validateMiddleware(createReportSchema),
  createReportController,
);

// Get likes for a post (paginated)
router.get(
  "/posts/:postId/likes",
  optionalAuthMiddleware,
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  getLikes,
);

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * FOLLOW MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

// Toggle follow user
router.post(
  "/users/:userId/follow",
  authMiddleware,
  interactionLimiter,
  cooldown({ windowMs: 1000, message: "Please wait before following again." }),
  validateMiddleware(followActionSchema),
  toggleFollow,
);

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * NOTIFICATIONS MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

// Live notification stream (SSE) — one long-lived connection per device;
// the client falls back to polling /notifications if this isn't available.
router.get(
  "/notifications/stream",
  authMiddleware,
  notificationStreamLimiter,
  streamNotifications,
);

// Get notifications (paginated)
// clampPagination runs BEFORE validateMiddleware so an out-of-range
// page/limit gets clamped into range first — the reverse order (as this
// used to be) meant validation rejected anything clampPagination was
// supposed to fix before it ever got the chance to run.
router.get(
  "/notifications",
  authMiddleware,
  notificationLimiter,
  clampPagination({ maxLimit: 50 }),
  validateMiddleware(getNotificationsSchema),
  getNotifications,
);

// Get unread notifications count
router.get(
  "/notifications/unread-count",
  authMiddleware,
  notificationLimiter,
  getUnreadCount,
);

// Mark all notifications as read
router.patch(
  "/notifications/read-all",
  authMiddleware,
  notificationLimiter,
  markAllAsRead,
);

// Mark single notification as read
router.patch(
  "/notifications/:notificationId/read",
  authMiddleware,
  notificationLimiter,
  validateMiddleware(notificationParamsSchema),
  markOneAsRead,
);

// Delete a single notification
router.delete(
  "/notifications/:notificationId",
  authMiddleware,
  notificationLimiter,
  validateMiddleware(notificationParamsSchema),
  deleteNotification,
);

export default router;
