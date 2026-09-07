import { Response, Request } from "express";
import { User } from "../../models/users/user.model.js";
import {
  AUTH_USER_SELECT,
  serializeAuthUser,
} from "../../utils/serializeAuthUser.js";

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
  const userId = req.user.userId;

  const user = await User.findById(userId).select(AUTH_USER_SELECT).lean();

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: { user: serializeAuthUser(user) },
  });
};
