import { NextFunction, Request, Response, Router } from "express";

// Controllers - Posts
import { createPost } from "../../controllers/social-controllers/post/createPost.js";
import { editPost } from "../../controllers/social-controllers/post/editPost.js";
import { deletePost } from "../../controllers/social-controllers/post/deletePost.js";
import { getFeed } from "../../controllers/social-controllers/post/getFeedPosts.js";
import { getUserPosts } from "../../controllers/social-controllers/post/getUserPosts.js";

// Controllers - Comments
import { createComment } from "../../controllers/social-controllers/comment/createComment.js";
import { editComment } from "../../controllers/social-controllers/comment/editComment.js";
import { deleteComment } from "../../controllers/social-controllers/comment/deleteComment.js";
import { getComments } from "../../controllers/social-controllers/comment/getComments.js";
import { getReplies } from "../../controllers/social-controllers/comment/getReplies.js";

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
} from "../../controllers/social-controllers/notification/markAsRead.js";

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
import {
  likeActionSchema,
  likeParamsSchema,
} from "../../validators/social-zod/like.zod.js";
import {
  followActionSchema,
  followListSchema,
} from "../../validators/social-zod/follow.zod.js";
import {
  notificationParamsSchema,
  getNotificationsSchema,
} from "../../validators/social-zod/notification.zod.js";
import { createReportSchema } from "../../validators/social-zod/report.zod.js";

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
router.get("/feed", optionalAuthMiddleware, getFeed);

// Get all comments for a post - Public route
router.get("/posts/:postId/comments", optionalAuthMiddleware, getComments);

// Get replies for a comment - Public route
router.get(
  "/posts/:postId/comments/:commentId/replies",
  optionalAuthMiddleware,
  getReplies,
);

// Get user profile - Public route
router.get("/users/:userId", optionalAuthMiddleware, getProfile);

// Get user's posts (for profile page) - Public route
router.get("/users/:userId/posts", optionalAuthMiddleware, getUserPosts);

// Get user's followers (paginated) - Public route
router.get(
  "/users/:userId/followers",
  validateMiddleware(followListSchema),
  getFollowers,
);

// Get user's following (paginated) - Public route
router.get(
  "/users/:userId/following",
  validateMiddleware(followListSchema),
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
  uploadPostFiles,
  validateMiddleware(createPostSchema),
  createPost,
);

// Update post
router.patch(
  "/posts/:postId",
  authMiddleware,
  uploadPostFiles,
  validateMiddleware(editPostSchema),
  editPost,
);

// Delete post
router.delete("/posts/:postId", authMiddleware, deletePost);

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * COMMENTS MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

// Create comment
router.post(
  "/posts/:postId/comments",
  authMiddleware,
  validateMiddleware(createCommentSchema),
  createComment,
);

// Edit comment
router.patch(
  "/posts/:postId/comments/:commentId",
  authMiddleware,
  validateMiddleware(editCommentSchema),
  editComment,
);

// Delete comment
router.delete(
  "/posts/:postId/comments/:commentId",
  authMiddleware,
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
  validateMiddleware(createReportSchema),
  createReportController,
);

// Get likes for a post (paginated)
router.get("/posts/:postId/likes", optionalAuthMiddleware, getLikes);

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * FOLLOW MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

// Toggle follow user
router.post(
  "/users/:userId/follow",
  authMiddleware,
  validateMiddleware(followActionSchema),
  toggleFollow,
);

/**
 * ───────────────────────────────────────────────────────────────────────────────
 * NOTIFICATIONS MANAGEMENT ROUTES
 * ───────────────────────────────────────────────────────────────────────────────
 */

// Get notifications (paginated)
router.get(
  "/notifications",
  authMiddleware,
  validateMiddleware(getNotificationsSchema),
  getNotifications,
);

// Get unread notifications count
router.get("/notifications/unread-count", authMiddleware, getUnreadCount);

// Mark all notifications as read
router.patch("/notifications/read-all", authMiddleware, markAllAsRead);

// Mark single notification as read
router.patch(
  "/notifications/:notificationId/read",
  authMiddleware,
  markOneAsRead,
);

export default router;
