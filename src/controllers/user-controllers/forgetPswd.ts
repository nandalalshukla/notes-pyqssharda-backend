//forgot password controller
import { User } from "../../models/users/user.model.js";
import { Request, Response } from "express";
import { sendAndStoreOtp } from "../../utils/Otp.js";

const GENERIC_MESSAGE =
  "If an eligible account exists for this email, a password reset code will be sent.";

export const forgetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }
  try {
    const user = await User.findOne({ email, isEmailVerified: true })
      .select("email")
      .lean();

    // Only verified accounts are eligible for password recovery. Always
    // return the same response so the endpoint does not reveal whether an
    // eligible account exists for the supplied address.
    if (user) {
      await sendAndStoreOtp(user.email, "password-reset");
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
