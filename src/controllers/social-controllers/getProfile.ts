import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { Follow } from "../../models/social/follow.model.js";
import { Post } from "../../models/social/post.model.js";

export const getProfile = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const currentUserId = req.user?.userId;

  try {
    const user = await User.findById(userId)
      .select(
        "_id name username email bio profilePic course contactNo privacySettings followersCount followingCount contributions role +isActive",
      )
      .lean();

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [postsCount, followRelation] = await Promise.all([
      Post.countDocuments({ author: userId, isDeleted: false }),
      currentUserId && currentUserId !== userId
        ? Follow.findOne({ follower: currentUserId, following: userId }).select(
            "_id",
          )
        : Promise.resolve(null),
    ]);
    const isFollowedByCurrentUser = !!followRelation;

    // Apply privacy settings - mask email and phone if user doesn't want to show them
    const isOwnProfile = currentUserId === userId;
    let displayEmail = user.email;
    let displayContactNo = user.contactNo;

    if (!isOwnProfile) {
      // Mask email if privacy setting is false
      if (!user.privacySettings?.showEmail && user.email) {
        const [localPart, domain] = user.email.split("@");
        const maskedLocal =
          localPart.length > 2
            ? localPart.slice(0, 2) + "*".repeat(localPart.length - 2)
            : "**";
        displayEmail = `${maskedLocal}@${domain}`;
      }

      // Mask contact number if privacy setting is false
      if (!user.privacySettings?.showContactNo && user.contactNo) {
        const lastTwo = user.contactNo.slice(-2);
        displayContactNo = "*".repeat(8) + lastTwo;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: displayEmail,
          bio: user.bio,
          profilePic: user.profilePic,
          course: user.course,
          contactNo: displayContactNo,
          role: user.role,
          stats: {
            postsCount,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            contributions: user.contributions,
          },
          isFollowedByCurrentUser,
          isOwnProfile,
        },
      },
    });
  } catch (err: unknown) {
    console.error("getProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
