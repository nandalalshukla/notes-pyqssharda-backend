//reset password (via forgot-password OTP) controller
import { User } from "../../models/users/user.model.js";
import { Session } from "../../models/users/session.model.js";
import { Request, Response } from "express";
import { hashPassword } from "../../utils/hashPassword.js";
import { verifyOtp } from "../../utils/Otp.js";

export const createNewPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email, OTP and new password are required",
    });
  }
  // Same message every failure branch below responds with — a caller who
  // doesn't know the right (email, otp) pair can't tell whether the email
  // isn't registered, has no pending reset, or the OTP expired/mismatched.
  const INVALID_OTP_RESPONSE = {
    success: false,
    message: "Invalid or expired OTP",
  } as const;

  try {
    const user = await User.findOne({ email, isEmailVerified: true }).select(
      "+emailOtpHash +emailOtpExpiry +emailOtpPurpose",
    );
    if (!user) {
      return res.status(400).json(INVALID_OTP_RESPONSE);
    }

    const hashedOtp = user.emailOtpHash;
    if (!hashedOtp || user.emailOtpPurpose !== "password-reset") {
      return res.status(400).json(INVALID_OTP_RESPONSE);
    }

    // Previously missing entirely — an OTP whose `emailOtpExpiry` had
    // already passed was still accepted here as long as no newer OTP had
    // overwritten it, so a "3-minute" reset code effectively never expired.
    if (!user.emailOtpExpiry || user.emailOtpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired, please request a new one",
      });
    }

    const isOtpValid = await verifyOtp(otp, hashedOtp);
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const hashedNewPassword = await hashPassword(newPassword);
    const updateResult = await User.updateOne(
      {
        _id: user._id,
        isEmailVerified: true,
        emailOtpHash: hashedOtp,
        emailOtpPurpose: "password-reset",
        emailOtpExpiry: { $gt: new Date() },
      },
      {
        $set: {
          password: hashedNewPassword,
          passwordChangedAt: new Date(),
        },
        $unset: {
          emailOtpHash: 1,
          emailOtpExpiry: 1,
          emailOtpPurpose: 1,
          emailOtpSentAt: 1,
        },
      },
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json(INVALID_OTP_RESPONSE);
    }

    // A password reset is a recovery action taken because the account may
    // be compromised — every existing session (including any an attacker
    // holds) must be invalidated, not just left to expire naturally.
    await Session.deleteMany({ userId: user._id });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    throw error;
  }
};

export default createNewPassword;
