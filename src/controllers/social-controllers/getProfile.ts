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
        "_id name username email bio profilePic course contactNo privacy followersCount followingCount contributions role +isActive",
      )
      .lean();

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isOwnProfile = currentUserId === userId;

    // Privacy flags are advisory only for the owner — you always see your
    // own details (the settings screen has to be able to show you what
    // you're hiding). For everyone else they're enforced here, by simply
    // not putting the value on the wire: masking in the client would still
    // ship the data to whoever opened devtools.
    //
    // `?? true` mirrors the schema default so accounts created before
    // these settings existed keep sharing exactly what they shared before.
    const privacy = {
      showEmail: user.privacy?.showEmail ?? true,
      showContactNo: user.privacy?.showContactNo ?? true,
      showCourse: user.privacy?.showCourse ?? true,
    };
    const canSee = (flag: boolean) => isOwnProfile || flag;

    const [postsCount, followRelation] = await Promise.all([
      // Anonymous posts are excluded from someone else's view of the
      // count for the same reason getUserPosts omits them from the list:
      // a count that doesn't match the visible posts would itself hint
      // that hidden ones exist.
      Post.countDocuments({
        author: userId,
        isDeleted: false,
        // Must match getUserPosts' filter exactly — a count that disagreed
        // with the visible list would itself hint at the hidden posts.
        ...(isOwnProfile
          ? {}
          : { isAnonymous: { $ne: true }, moderationStatus: "approved" }),
      }),
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
          email: canSee(privacy.showEmail) ? user.email : null,
          bio: user.bio,
          profilePic: user.profilePic,
          course: canSee(privacy.showCourse) ? user.course : null,
          contactNo: canSee(privacy.showContactNo) ? user.contactNo : null,
          role: user.role,
          // Only the owner is told what the settings are — to anyone else
          // even the shape of someone's privacy choices is their business.
          ...(isOwnProfile ? { privacy } : {}),
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
  } catch (err) {
    throw err;
  }
};
