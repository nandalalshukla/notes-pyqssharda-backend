//forgot password controller
import { User } from "../../models/users/user.model.js";
import { Request, Response } from "express";
import { sendAndStoreOtp } from "../../utils/Otp.js";

const GENERIC_MESSAGE =
  "If an account exists for this email, a password reset OTP has been sent.";

export const forgetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }
  try {
    const user = await User.findOne({ email }).select("email").lean();

    // Always return the same 200 + generic message whether or not the
    // account exists — the message already promises this, but the code
    // used to 404 on a miss, letting anyone enumerate registered emails
    // through the password-recovery endpoint.
    if (user) {
      await sendAndStoreOtp(user.email);
    }

    return res.status(200).json({
      success: true,
      message: GENERIC_MESSAGE,
    });
  } catch (error) {
    console.error("Error in forget password:", error);
    // Even on a send failure, don't leak whether the account existed.
    return res.status(200).json({
      success: true,
      message: GENERIC_MESSAGE,
    });
  }
};

export default forgetPassword;
