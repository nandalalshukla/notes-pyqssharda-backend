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
  try {
    const user = await User.findOne({ email }).select(
      "+emailOtpHash +emailOtpExpiry",
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedOtp = user.emailOtpHash;
    if (!hashedOtp) {
      return res.status(400).json({
        success: false,
        message: "No OTP found for this user, please request a new one",
      });
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
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    user.emailOtpHash = undefined;
    user.emailOtpExpiry = undefined;
    await user.save();

    // A password reset is a recovery action taken because the account may
    // be compromised — every existing session (including any an attacker
    // holds) must be invalidated, not just left to expire naturally.
    await Session.deleteMany({ userId: user._id });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error in reset password:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default createNewPassword;
