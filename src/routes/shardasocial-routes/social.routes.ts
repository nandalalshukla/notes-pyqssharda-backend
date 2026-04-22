import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import {
  isAuthenticated,
  isModerator,
  isAdmin,
} from "../../middlewares/auth/authorization.middleware.js";
import { uploadPostsMulter } from "../../config/multer.js";

// User Profile Controllers
import {
  getUserProfile,
  getMyProfile,
  updateUserProfile,
  getFollowers,
  getFollowing,
} from "../../controllers/shardasocial-controllers/userProfile.js";

// Post Controllers
import {
  createPost,
  getPost,
  getAllPosts,
  getUserPosts,
  updatePost,
  deletePost,
} from "../../controllers/shardasocial-controllers/postController.js";

// Like Controllers
import {
  likePost,
  unlikePost,
  likeComment,
  unlikeComment,
  getPostLikes,
  getCommentLikes,
} from "../../controllers/shardasocial-controllers/likeController.js";

// Comment Controllers
import {
  createComment,
  getPostComments,
  getCommentReplies,
  updateComment,
  deleteComment,
} from "../../controllers/shardasocial-controllers/commentController.js";

// Follow Controllers
import {
  followUser,
  unfollowUser,
  checkFollowStatus,
  getSuggestedUsers,
} from "../../controllers/shardasocial-controllers/followController.js";

// Notification Controllers
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
} from "../../controllers/shardasocial-controllers/notificationController.js";

// Share Controllers
import {
  sharePost,
  unsharePost,
  getPostShares,
  getUserShares,
} from "../../controllers/shardasocial-controllers/shareController.js";

// Admin Controllers
import {
  getAllUsers,
  deactivateUser,
  activateUser,
  adminDeletePost,
  adminDeleteComment,
  getModRequests,
  approveModRequest,
  rejectModRequest,
} from "../../controllers/shardasocial-controllers/adminController.js";

const router = Router();

// ============ PUBLIC ROUTES ============

// User Profiles (public read)
router.get("/profiles/:usernameOrId", getUserProfile);
router.get("/profiles/:usernameOrId/followers", getFollowers);
router.get("/profiles/:usernameOrId/following", getFollowing);

// Posts (public read)
router.get("/posts", getAllPosts);
router.get("/posts/:postId", getPost);
router.get("/posts/user/:usernameOrId", getUserPosts);

// Likes (public read)
router.get("/likes/post/:postId", getPostLikes);
router.get("/likes/comment/:commentId", getCommentLikes);

// Comments (public read)
router.get("/comments/post/:postId", getPostComments);
router.get("/comments/:commentId/replies", getCommentReplies);

// Shares (public read)
router.get("/shares/:postId", getPostShares);
router.get("/shares/user/:usernameOrId", getUserShares);

// ============ AUTHENTICATED ROUTES ============

// User Profiles (authenticated write)
router.use(authMiddleware);

router.get("/me/profile", getMyProfile);
router.put("/profiles/update", updateUserProfile);

// Posts
router.post("/posts", uploadPostsMulter.array("media", 5), createPost);
router.put("/posts/:postId", updatePost);
router.delete("/posts/:postId", deletePost);

// Likes
router.post("/likes/post/:postId", likePost);
router.delete("/likes/post/:postId", unlikePost);
router.post("/likes/comment/:commentId", likeComment);
router.delete("/likes/comment/:commentId", unlikeComment);

// Comments
router.post("/comments/post/:postId", createComment);
router.put("/comments/:commentId", updateComment);
router.delete("/comments/:commentId", deleteComment);

// Follow
router.post("/follow/:usernameOrId", followUser);
router.delete("/follow/:usernameOrId", unfollowUser);
router.get("/follow/check/:usernameOrId", checkFollowStatus);
router.get("/follow/suggestions", getSuggestedUsers);

// Notifications
router.get("/notifications", getNotifications);
router.get("/notifications/unread/count", getUnreadCount);
router.put("/notifications/:notificationId/read", markNotificationAsRead);
router.put("/notifications/mark-all-read", markAllNotificationsAsRead);
router.delete("/notifications/:notificationId", deleteNotification);
router.delete("/notifications/clear-all", clearAllNotifications);

// Shares
router.post("/share/:postId", sharePost);
router.delete("/share/:postId", unsharePost);

// ============ MODERATOR ROUTES ============

router.use(isModerator);

// Moderation
router.delete("/admin/posts/:postId", adminDeletePost);
router.delete("/admin/comments/:commentId", adminDeleteComment);

// ============ ADMIN ROUTES ============

router.use(isAdmin);

// User Management
router.get("/admin/users", getAllUsers);
router.put("/admin/users/:userId/deactivate", deactivateUser);
router.put("/admin/users/:userId/activate", activateUser);

// Mod Requests
router.get("/admin/mod-requests", getModRequests);
router.put("/admin/mod-requests/:requestId/approve", approveModRequest);
router.put("/admin/mod-requests/:requestId/reject", rejectModRequest);

export default router;
