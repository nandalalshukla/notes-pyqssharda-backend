import { Request, Response } from "express";
import { verifyOtp } from "../../utils/Otp";
import { User } from "../../models/users/user.model";
import jwt from "jsonwebtoken";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookies";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateJwtTokens";
import { JwtPayload } from "jsonwebtoken";

interface VerifyEmailTokenPayload extends JwtPayload {
  userId: string;
}

export default async function verifyEmail(req: Request, res: Response) {
  const { token, otp } = req.body;
  const secret = process.env.VERIFY_EMAIL_TOKEN_SECRET;

  if (!secret) {
    throw new Error("VERIFY_EMAIL_TOKEN_SECRET is not defined");
  }

  const decoded = jwt.verify(token, secret) as VerifyEmailTokenPayload;

  const userId = decoded.userId;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
  if (!otp) {
    return res.status(400).json({
      success: false,
      message: "OTP is required",
    });
  }
  const hashedOtp = user.emailOtpHash;
  if (!hashedOtp) {
    return res.status(400).json({
      success: false,
      message: "No OTP found for this user, please request a new one",
    });
  }
  try {
    const verifyEmail = await verifyOtp(otp, hashedOtp);
    if (!verifyEmail) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    user.isEmailVerified = true;
    user.emailOtpHash = undefined;
    await user.save();
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
