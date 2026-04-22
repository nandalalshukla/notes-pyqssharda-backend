import { comparePassword } from "../../utils/hashPassword.js";
import { User } from "../../models/sharda-social/user.model.js";
import { Session } from "../../models/sharda-social/session.model.js";
import { Request, Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateJwtTokens.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookies.js";
import { loginSchema } from "../../validators/social-zod/social.zod.js";

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input with Zod schema
  try {
    loginSchema.parse({ email, password });
  } catch (validationError: any) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: validationError.errors,
    });
  }

  try {
    // Find user and select password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    // Verify password
    const isMatch = await comparePassword(password, user.password!);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    // Store refresh token in Session collection with device info and IP
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ipAddress = req.ip || req.socket.remoteAddress || "Unknown";

    const session = new Session({
      userId: user._id,
      refreshToken,
      deviceInfo: userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await session.save();

    // Set cookies
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          profilePic: user.profilePic?.url,
          isEmailVerified: user.isEmailVerified,
          bio: user.bio,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
        },
      },
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
