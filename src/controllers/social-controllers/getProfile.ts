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
        "_id name username email bio profilePic course contactNo followersCount followingCount contributions role +isActive",
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

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePic: user.profilePic,
          course: user.course,
          contactNo: user.contactNo,
          role: user.role,
          stats: {
            postsCount,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            contributions: user.contributions,
          },
          isFollowedByCurrentUser,
          isOwnProfile: currentUserId === userId,
        },
      },
    });
  } catch (err) {
    throw err;
  }
};
