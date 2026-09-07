import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import cloudinary from "../../config/cloudinary.js";
import { serializeAuthUser } from "../../utils/serializeAuthUser.js";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; userRole?: string };
    }
  }
}

export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { bio, course, contactNo, name, showEmail, showContactNo, showCourse } =
    req.body;

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

    // ── Privacy toggles — each independently settable ────────────────────────
    // Every flag falls back to its current value (then to the schema
    // default of `true`), so a request that only sends `showEmail` leaves
    // the other two exactly as the user last set them.
    if (
      showEmail !== undefined ||
      showContactNo !== undefined ||
      showCourse !== undefined
    ) {
      user.privacy = {
        showEmail: showEmail ?? user.privacy?.showEmail ?? true,
        showContactNo: showContactNo ?? user.privacy?.showContactNo ?? true,
        showCourse: showCourse ?? user.privacy?.showCourse ?? true,
      };
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
      data: { user: serializeAuthUser(user) },
    });
  } catch (error) {
    throw error;
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
      // Returns the whole user, not just `profilePic`. The client writes
      // this straight into its auth store, and a payload without a `user`
      // key set that store to undefined — removing your avatar logged you
      // out of the UI until the next reload.
      data: { user: serializeAuthUser(user), profilePic: user.profilePic },
    });
  } catch (error) {
    throw error;
  }
};
