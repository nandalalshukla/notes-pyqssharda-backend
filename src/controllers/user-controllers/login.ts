import { comparePassword } from "../../utils/hashPassword.js";
import { User } from "../../models/users/user.model.js";
import { Session } from "../../models/users/session.model.js";
import { Request, Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateJwtTokens.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookies.js";
import { sendAndStoreOtp } from "../../utils/Otp.js";

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const user = await User.findOne({ email }).select("+password +isActive");

    //Use a generic message for both cases — don't reveal which field is wrong
    if (!user || !(await comparePassword(password, user.password!))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated, please contact support",
      });
    }

    if (!user.isEmailVerified) {
      sendAndStoreOtp(user.email)
        .then(() => console.log(`✅ OTP sent successfully to ${email}`))
        .catch((emailError) => {
          console.error("⚠️ Failed to send OTP email:", emailError);
          console.error("User can request resend OTP later.");
        });

      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        data: { userId: user._id }, // so client can redirect to OTP screen
      });
    }

    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    // Create session instead of storing token on user
    await Session.create({
      userId: user._id,
      refreshToken,
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          profilePic: user.profilePic,
          bio: user.bio,
          course: user.course,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          contributions: user.contributions,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
