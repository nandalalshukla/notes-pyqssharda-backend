import { Request, Response } from "express";
import { User } from "../../models/sharda-social/user.model.js";
import { Post } from "../../models/sharda-social/post.model.js";
import { Comment } from "../../models/sharda-social/comment.model.js";
import { ModRequest } from "../../models/sharda-social/modRequest.model.js";
import mongoose from "mongoose";

/**
 * Get all users (admin only)
 * @route GET /api/v1/admin/users
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.userRole;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can access this",
      });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const role = req.query.role as string;
    const search = req.query.search as string;

    // Build filter
    const filter: any = {};
    if (role && ["user", "mod", "admin"].includes(role)) {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password -emailOtpHash -forgotPasswordToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        users: users.map((user) => ({
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          followersCount: user.followersCount,
          createdAt: user.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Users fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Deactivate a user (admin only)
 * @route PUT /api/v1/admin/users/:userId/deactivate
 */
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?.userId;
    const userRole = (req as any).user?.userRole;
    const { userId } = req.params;
    const { reason } = req.body;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can deactivate users",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate yourself",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
        },
      },
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Reactivate a user (admin only)
 * @route PUT /api/v1/admin/users/:userId/activate
 */
export const activateUser = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.userRole;
    const { userId } = req.params;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can activate users",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
        },
      },
      message: "User activated successfully",
    });
  } catch (error) {
    console.error("Error activating user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete post (admin/mod can delete any post)
 * @route DELETE /api/v1/admin/posts/:postId
 */
export const adminDeletePost = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.userRole;
    const { postId } = req.params;
    const { reason } = req.body;

    if (!["admin", "mod"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and mods can delete posts",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    post.isDeleted = true;
    await post.save();

    return res.status(200).json({
      success: true,
      data: {},
      message: `Post deleted by ${userRole}. Reason: ${reason || "No reason provided"}`,
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete comment (admin/mod can delete any comment)
 * @route DELETE /api/v1/admin/comments/:commentId
 */
export const adminDeleteComment = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.userRole;
    const { commentId } = req.params;
    const { reason } = req.body;

    if (!["admin", "mod"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and mods can delete comments",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const post = await Post.findById(comment.post);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    comment.isDeleted = true;
    await comment.save();

    return res.status(200).json({
      success: true,
      data: {},
      message: `Comment deleted by ${userRole}. Reason: ${reason || "No reason provided"}`,
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get moderation requests (admin only)
 * @route GET /api/v1/admin/mod-requests
 */
export const getModRequests = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.userRole;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view mod requests",
      });
    }

    const status = req.query.status as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const requests = await ModRequest.find(filter)
      .populate("userId", "name email username")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await ModRequest.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        modRequests: requests.map((req) => ({
          id: req._id,
          user: {
            id: (req.userId as any)._id,
            name: (req.userId as any).name,
            email: (req.userId as any).email,
            username: (req.userId as any).username,
          },
          motivation: req.motivation,
          status: req.status,
          rejectionReason: req.rejectionReason,
          reviewedBy: req.reviewedBy
            ? {
                id: (req.reviewedBy as any)._id,
                name: (req.reviewedBy as any).name,
              }
            : null,
          reviewedAt: req.reviewedAt,
          createdAt: req.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Mod requests fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching mod requests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Approve mod request (admin only)
 * @route PUT /api/v1/admin/mod-requests/:requestId/approve
 */
export const approveModRequest = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?.userId;
    const userRole = (req as any).user?.userRole;
    const { requestId } = req.params;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can approve mod requests",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const modRequest = await ModRequest.findById(requestId);

    if (!modRequest) {
      return res.status(404).json({
        success: false,
        message: "Mod request not found",
      });
    }

    if (modRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be approved",
      });
    }

    // Update request
    modRequest.status = "approved";
    modRequest.reviewedBy = adminId;
    modRequest.reviewedAt = new Date();
    await modRequest.save();

    // Update user role
    const user = await User.findByIdAndUpdate(
      modRequest.userId,
      { role: "mod" },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        modRequest: {
          id: modRequest._id,
          status: modRequest.status,
        },
        user: {
          id: user?._id,
          role: user?.role,
        },
      },
      message: "Mod request approved successfully",
    });
  } catch (error) {
    console.error("Error approving mod request:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Reject mod request (admin only)
 * @route PUT /api/v1/admin/mod-requests/:requestId/reject
 */
export const rejectModRequest = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?.userId;
    const userRole = (req as any).user?.userRole;
    const { requestId } = req.params;
    const { reason } = req.body;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can reject mod requests",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const modRequest = await ModRequest.findById(requestId);

    if (!modRequest) {
      return res.status(404).json({
        success: false,
        message: "Mod request not found",
      });
    }

    if (modRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be rejected",
      });
    }

    // Update request
    modRequest.status = "rejected";
    modRequest.reviewedBy = adminId;
    modRequest.reviewedAt = new Date();
    modRequest.rejectionReason = reason;
    await modRequest.save();

    return res.status(200).json({
      success: true,
      data: {
        modRequest: {
          id: modRequest._id,
          status: modRequest.status,
          rejectionReason: modRequest.rejectionReason,
        },
      },
      message: "Mod request rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting mod request:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
