import jwt from "jsonwebtoken";
import { User } from "../../models/users/user.model";
import { generateAccessToken } from "../../utils/generateJwtTokens";
import { Request, Response } from "express";
import { accessTokenCookieOptions } from "../../config/cookies";

export const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  console.log(
    "Refresh token from cookie:",
    refreshToken ? "exists" : "missing"
  );

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as { userId: string };

    // Must use .select("+refreshToken") because it has select: false in the model
    const user = await User.findById(payload.userId).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      console.log(
        "Token mismatch - stored:",
        user?.refreshToken?.slice(0, 20),
        "received:",
        refreshToken?.slice(0, 20)
      );
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user._id.toString(), user.role);
    res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.log("Refresh token error:", err);
    return res.status(403).json({ message: "Refresh token expired" });
  }
};
