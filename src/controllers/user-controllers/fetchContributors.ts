import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";

export const fetchContributors = async (req: Request, res: Response) => {
  try {
    const contributors = await User.find({ contributions: { $gt: 0 } })
      .select("name email contributions createdAt privacy")
      .sort({ contributions: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      // The leaderboard is public, so it honours each contributor's "show
      // my email" setting the same way the profile and likes endpoints do
      // — otherwise opting out on the profile would mean nothing while the
      // same address sat one page over. `?? true` keeps accounts created
      // before the setting existed behaving as they always did.
      contributors: contributors.map(({ privacy, email, ...contributor }) => ({
        ...contributor,
        email: (privacy?.showEmail ?? true) ? email : null,
      })),
    });
  } catch (error) {
    throw error;
  }
};
