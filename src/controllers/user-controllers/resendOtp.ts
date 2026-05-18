import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { sendAndStoreOtp } from "../../utils/Otp.js";

export const resendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email })
      .select("email isEmailVerified")
      .lean();

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.isEmailVerified)
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });

    await sendAndStoreOtp(user.email);

    return res.json({
      success: true,
      message: "If email exists otp has been sent",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP" });
  }
};
