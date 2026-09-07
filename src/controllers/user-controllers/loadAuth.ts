import { Response, Request } from "express";
import { User } from "../../models/users/user.model.js";

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
  const userId = req.user.userId;

  const user = await User.findById(userId)
    .select(
      "_id name username email role profilePic bio course contactNo privacy followersCount followingCount contributions isEmailVerified createdAt",
    )
    .lean();

  if (!user) {
    return res.status(401).json({
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
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
        bio: user.bio,
        course: user.course,
        contactNo: user.contactNo,
        // Needed so the settings screen can render the user's current
        // privacy choices on load rather than guessing at the defaults.
        privacy: {
          showEmail: user.privacy?.showEmail ?? true,
          showContactNo: user.privacy?.showContactNo ?? true,
          showCourse: user.privacy?.showCourse ?? true,
        },
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        contributions: user.contributions,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    },
  });
};
