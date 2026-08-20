import {
  comparePassword,
  DUMMY_PASSWORD_HASH,
} from "../../utils/hashPassword.js";
import { User } from "../../models/users/user.model.js";
import { Session } from "../../models/users/session.model.js";
import { Request, Response } from "express";
import {
  generateAccessToken,
  generateRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from "../../utils/generateJwtTokens.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookies.js";
import { sendAndStoreOtp } from "../../utils/Otp.js";
import { hashToken } from "../../utils/hashToken.js";

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

    // Always run a bcrypt compare, even for a nonexistent user, against a
    // fixed dummy hash — otherwise a request for an unknown email returns
    // near-instantly while a wrong password takes ~bcrypt's cost-factor
    // delay, letting an attacker enumerate valid emails by response timing
    // despite the generic "Invalid credentials" message below.
    const isPasswordValid = await comparePassword(
      password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );

    // Use consistent message for security - don't reveal if email exists
    if (!user || !isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
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
      refreshTokenHash: hashToken(refreshToken),
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
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
    throw error;
  }
};
