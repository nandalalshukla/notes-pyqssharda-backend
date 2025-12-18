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
  console.log("Received body:", req.body);
  const { token, otp } = req.body;
  const secret = process.env.VERIFY_EMAIL_TOKEN_SECRET;

  if (!secret) {
    throw new Error("VERIFY_EMAIL_TOKEN_SECRET is not defined");
  }

  if (!token || !otp) {
    return res.status(400).json({
      success: false,
      message: "Token and OTP are required",
    });
  }

  let decoded: VerifyEmailTokenPayload;

  try {
    decoded = jwt.verify(token, secret) as VerifyEmailTokenPayload;
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token",
    });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!user.emailOtpHash) {
    return res.status(400).json({
      success: false,
      message: "OTP expired or not found",
    });
  }
  console.log("User found:", user);
  console.log("Stored OTP:", user.emailOtpHash);

  const isValidOtp = await verifyOtp(otp.toString(), user.emailOtpHash);
  console.log("Is valid OTP:", isValidOtp);
  if (!isValidOtp) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }
  try {
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    user.isEmailVerified = true;
    user.refreshToken = refreshToken;
    user.emailOtpHash = undefined;
    await user.save();

    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Error generating tokens:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
