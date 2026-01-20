import { User } from "../../models/users/user.model.js";
import { Request, Response } from "express";
import { sendAndStoreOtp } from "../../utils/Otp.js";
import { generateEmailVerifyToken } from "../../utils/generateJwtTokens.js";
import { hashPassword } from "../../utils/hashPassword.js";

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  try {
    const hashedPwd = await hashPassword(password);
    const newUser = new User({
      name,
      email,
      password: hashedPwd,
    });
    await newUser.save();

    // Send OTP email (don't fail registration if email fails)
    try {
      await sendAndStoreOtp(newUser.email);
      console.log(`✅ OTP sent successfully to ${email}`);
    } catch (emailError) {
      console.error("⚠️ Failed to send OTP email:", emailError);
      console.error(
        "User created but email not sent. User can request resend OTP.",
      );
      // Continue with registration even if email fails
    }

    const verifyToken = generateEmailVerifyToken(newUser._id.toString());
    return res.status(201).json({
      success: true,
      verifyToken,
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isEmailVerified: false,
        },
      },

      message: "User registered successfully please verify your email",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
