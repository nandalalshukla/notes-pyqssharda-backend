import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import cloudinary from "../../config/cloudinary.js";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; userRole?: string };
    }
  }
}

export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { bio, course, contactNo, name, showEmail, showContactNo } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ── Text fields — only update what was sent ──────────────────────────────
    if (name !== undefined) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (course !== undefined) user.course = course.trim();
    if (contactNo !== undefined) user.contactNo = contactNo.trim();

    // ── Privacy settings — update if provided ────────────────────────────────
    if (showEmail !== undefined) {
      if (!user.privacySettings) {
        user.privacySettings = { showEmail: true, showContactNo: true };
      }
      user.privacySettings.showEmail = showEmail;
    }
    if (showContactNo !== undefined) {
      if (!user.privacySettings) {
        user.privacySettings = { showEmail: true, showContactNo: true };
      }
      user.privacySettings.showContactNo = showContactNo;
    }

    // ── Profile pic — only runs if a file was uploaded ───────────────────────
    if (req.file) {
      // req.file.path is the Cloudinary URL, req.file.filename is the public_id
      // Since we use user_${userId} as public_id, it auto-overwrites on Cloudinary
      // We just need to update the DB reference
      user.profilePic = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          bio: user.bio,
          course: user.course,
          contactNo: user.contactNo,
          profilePic: user.profilePic,
          privacySettings: user.privacySettings,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          contributions: user.contributions,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const removeProfilePic = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.profilePic?.publicId) {
      return res.status(400).json({
        success: false,
        message: "No profile picture to remove",
      });
    }

    // Delete from Cloudinary first
    await cloudinary.uploader.destroy(user.profilePic.publicId, {
      resource_type: "image",
    });

    // Clear from DB
    user.profilePic = { url: "", publicId: "" };
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      data: {
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error("Remove profile pic error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
