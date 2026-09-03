// controllers/follow/getFollowing.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";
import { User } from "../../../models/users/user.model.js";

export const getFollowing = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const [following, total] = await Promise.all([
      Follow.find({ follower: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("following")
        .populate("following", "name username profilePic bio role")
        .lean(),
      Follow.countDocuments({ follower: userId }),
    ]);
    const orphanedFollowIds = following
      .filter((f) => !f.following)
      .map((f) => f._id);
    const visibleFollowing = following.filter((f) => f.following);
    if (orphanedFollowIds.length > 0) {
      await Promise.all([
        Follow.deleteMany({ _id: { $in: orphanedFollowIds } }),
        User.updateOne(
          { _id: userId },
          { $inc: { followingCount: -orphanedFollowIds.length } },
        ),
      ]);
    }
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        data: visibleFollowing.map((f) => f.following),
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    throw err;
  }
};
