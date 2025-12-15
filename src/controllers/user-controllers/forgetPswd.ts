//forgot password controller
import { User } from "../../models/users/user.model";
import { Request, Response } from "express";
import { sendAndStoreOtp } from "../../utils/Otp";
import { generateForgetPswdToken } from "../../utils/generateJwtTokens";

export const forgetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    await sendAndStoreOtp(user.email);
    const forgetPswdToken = generateForgetPswdToken(user._id.toString());
    return res.status(200).json({
      success: true,
      forgetPswdToken,
      message: "Enter your new password along with the OTP sent to your email",
    });
  } catch (error) {
    console.error("Error in forget password:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default forgetPassword;
