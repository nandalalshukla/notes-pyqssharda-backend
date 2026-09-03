// controllers/follow/getFollowers.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";
import { User } from "../../../models/users/user.model.js";

export const getFollowers = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const [followers, total] = await Promise.all([
      Follow.find({ following: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("follower")
        .populate("follower", "name username profilePic bio role")
        .lean(),
      Follow.countDocuments({ following: userId }),
    ]);
    const orphanedFollowIds = followers
      .filter((f) => !f.follower)
      .map((f) => f._id);
    const visibleFollowers = followers.filter((f) => f.follower);
    if (orphanedFollowIds.length > 0) {
      await Promise.all([
        Follow.deleteMany({ _id: { $in: orphanedFollowIds } }),
        User.updateOne(
          { _id: userId },
          { $inc: { followersCount: -orphanedFollowIds.length } },
        ),
      ]);
    }
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        data: visibleFollowers.map((f) => f.follower),
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
