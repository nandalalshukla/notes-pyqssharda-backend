import { comparePassword } from "../../utils/hashPassword";
import { User } from "../../models/users/user.model";
import { Request, Response } from "express";
import { generateAccessToken } from "../../utils/generateJwtTokens";
import { generateRefreshToken } from "../../utils/generateJwtTokens";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookies";

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "The user with this email doesn't exist",
      });
    }
    const isMatch = await comparePassword(password, user.password!);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
    return res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
