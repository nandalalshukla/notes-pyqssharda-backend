import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { Session } from "../../models/users/session.model.js";
import { verifyOtp } from "../../utils/Otp.js";
import {
  generateAccessToken,
  generateRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from "../../utils/generateJwtTokens.js";
import { deliverTokens } from "../../utils/clientTokens.js";
import { hashToken } from "../../utils/hashToken.js";
import { serializeAuthUser } from "../../utils/serializeAuthUser.js";

export default async function verifyEmail(req: Request, res: Response) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  // Same generic message returned by every failure branch below — a caller
  // who doesn't know the right (email, otp) pair can't tell whether the
  // email isn't registered, the OTP expired, or the OTP was just wrong.
  const INVALID_OTP_RESPONSE = {
    success: false,
    message: "Invalid or expired OTP",
  } as const;

  try {
    const user = await User.findOne({ email }).select(
      "+emailOtpHash +emailOtpExpiry +emailOtpPurpose +verificationExpiresAt",
    );

    if (!user) {
      return res.status(400).json(INVALID_OTP_RESPONSE);
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const now = new Date();
    if (!user.verificationExpiresAt || user.verificationExpiresAt <= now) {
      await User.deleteOne({
        _id: user._id,
        isEmailVerified: false,
        $or: [
          { verificationExpiresAt: { $exists: false } },
          { verificationExpiresAt: { $lte: now } },
        ],
      });
      return res.status(410).json({
        success: false,
        message: "Your registration has expired. Please create a new account.",
        code: "REGISTRATION_EXPIRED",
      });
    }

    // Check expiry before hashing (cheaper operation first)
    if (
      !user.emailOtpExpiry ||
      user.emailOtpExpiry <= now ||
      user.emailOtpPurpose !== "email-verification"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please request a new code.",
      });
    }

    if (!user.emailOtpHash) {
      return res.status(400).json({
        success: false,
        message: "OTP not found, please request a new one",
      });
    }

    const isValidOtp = await verifyOtp(otp.toString(), user.emailOtpHash);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Consume the exact OTP atomically and clear the 24-hour reservation in
    // the same write. If TTL cleanup, a resend, or another verification won
    // the race, this conditional update cannot revive or re-verify the row.
    const verificationResult = await User.updateOne(
      {
        _id: user._id,
        isEmailVerified: false,
        verificationExpiresAt: { $gt: now },
        emailOtpHash: user.emailOtpHash,
        emailOtpExpiry: { $gt: now },
        emailOtpPurpose: "email-verification",
      },
      {
        $set: { isEmailVerified: true },
        $unset: {
          verificationExpiresAt: 1,
          emailOtpHash: 1,
          emailOtpExpiry: 1,
          emailOtpPurpose: 1,
          emailOtpSentAt: 1,
        },
      },
    );

    if (verificationResult.modifiedCount === 0) {
      const latest = await User.findById(user._id)
        .select("+verificationExpiresAt")
        .lean();
      if (
        latest &&
        !latest.isEmailVerified &&
        (!latest.verificationExpiresAt || latest.verificationExpiresAt <= new Date())
      ) {
        await User.deleteOne({
          _id: user._id,
          isEmailVerified: false,
          $or: [
            { verificationExpiresAt: { $exists: false } },
            { verificationExpiresAt: { $lte: new Date() } },
          ],
        });
        return res.status(410).json({
          success: false,
          message: "Your registration has expired. Please create a new account.",
          code: "REGISTRATION_EXPIRED",
        });
      }
      if (latest?.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }
      return res.status(400).json(INVALID_OTP_RESPONSE);
    }

    // Keep the hydrated document used for the response consistent with the
    // atomic database update above.
    user.isEmailVerified = true;
    user.verificationExpiresAt = undefined;
    user.emailOtpHash = undefined;
    user.emailOtpExpiry = undefined;
    user.emailOtpPurpose = undefined;
    user.emailOtpSentAt = undefined;

    // Verifying signs the user in, rather than sending them back to the
    // login screen to type the password they entered a minute ago: the OTP
    // they just supplied proves both that they own the email and that they
    // are the person who registered with it. Same session, cookies and
    // response body as a normal login (see login.ts) so the client can
    // treat the two identically.
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    await Session.create({
      userId: user._id,
      refreshTokenHash: hashToken(refreshToken),
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    const tokenPayload = deliverTokens(req, res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Email verified — you're signed in",
      data: { user: serializeAuthUser(user), ...tokenPayload },
    });
  } catch (error) {
    throw error;
  }
}
