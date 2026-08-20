import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { sendAndStoreOtp } from "../../utils/Otp.js";

const GENERIC_MESSAGE =
  "If that email needs verification, a new OTP has been sent.";

export const resendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email })
      .select("email isEmailVerified")
      .lean();

    // Always the same 200 + generic message whether the account exists,
    // doesn't exist, or is already verified — this used to 404 on a miss,
    // letting anyone enumerate registered emails through this endpoint.
    if (user && !user.isEmailVerified) {
      await sendAndStoreOtp(user.email);
    }

    return res.status(200).json({
      success: true,
      message: GENERIC_MESSAGE,
    });
  } catch (err) {
    // Even on a send failure, don't leak whether the account existed.
    return res.status(200).json({
      success: true,
      message: GENERIC_MESSAGE,
    });
  }
};
