import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { sendAndStoreOtp } from "../../utils/Otp.js";

const GENERIC_MESSAGE =
  "If this email has an active registration and a code was not sent recently, a verification code will be sent. You can request a code once per minute. Registrations expire 24 hours after signup.";

export const resendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email })
      .select("email isEmailVerified +verificationExpiresAt")
      .lean();

    // Always the same 200 + generic message whether the account exists,
    // doesn't exist, or is already verified — this used to 404 on a miss,
    // letting anyone enumerate registered emails through this endpoint.
    if (
      user &&
      !user.isEmailVerified &&
      user.verificationExpiresAt &&
      user.verificationExpiresAt > new Date()
    ) {
      await sendAndStoreOtp(user.email, "email-verification");
    }

    return res.status(200).json({
      success: true,
      message: GENERIC_MESSAGE,
    });
  } catch (err) {
    // Even on a send failure, don't leak whether the account existed.
    console.error("Failed to process verification OTP resend:", err);
    return res.status(200).json({
      success: true,
      message: GENERIC_MESSAGE,
    });
  }
};
