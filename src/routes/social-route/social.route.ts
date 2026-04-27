import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { createComment } from "../../controllers/social-controllers/comment/createComment.js";
import { editComment } from "../../controllers/social-controllers/comment/editComment.js";
import { deleteComment } from "../../controllers/social-controllers/comment/deleteComment.js";
import { getComments } from "../../controllers/social-controllers/comment/getComments.js";
import { toggleLike } from "../../controllers/social-controllers/like/toggleLike.js";
import { toggleFollow } from "../../controllers/social-controllers/follow/toggleFollow.js";
import { getFollowers } from "../../controllers/social-controllers/follow/getFollowers.js";
import { getFollowing } from "../../controllers/social-controllers/follow/getFollowing.js";
import { getNotifications } from "../../controllers/social-controllers/notification/getNotifications.js";
import { markAllAsRead, markOneAsRead } from "../../controllers/social-controllers/notification/markAsRead.js";
import { getFeed } from "../../controllers/social-controllers/post/getFeedPosts.js";
const router = Router();

// Comments
router.post("/posts/:postId/comments", authMiddleware, createComment);
router.patch("/posts/:postId/comments/:commentId", authMiddleware, editComment);
router.delete(
  "/posts/:postId/comments/:commentId",
  authMiddleware,
  deleteComment,
);
router.get("/posts/:postId/comments", authMiddleware, getComments);

// Likes
router.post("/likes/toggle", authMiddleware, toggleLike);

// Follow
router.post("/users/:userId/follow", authMiddleware, toggleFollow);
router.get("/users/:userId/followers", authMiddleware, getFollowers);
router.get("/users/:userId/following", authMiddleware, getFollowing);

// Notifications
router.get("/notifications", authMiddleware, getNotifications);
router.patch("/notifications/read-all", authMiddleware, markAllAsRead);
router.patch("/notifications/:id/read", authMiddleware, markOneAsRead);

// Feed
router.get("/feed", authMiddleware, getFeed);


export default router;