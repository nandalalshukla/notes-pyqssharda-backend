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

  // If user exists and is verified, block registration
  if (existingUser && existingUser.isEmailVerified) {
    return res.status(409).json({
      success: false,
      message: "User with this email already exists",
    });
  }

  // If user exists but is NOT verified, delete and allow re-registration
  if (existingUser && !existingUser.isEmailVerified) {
    console.log(`Deleting unverified user: ${email} to allow re-registration`);
    await User.deleteOne({ _id: existingUser._id });
  }

  try {
    const hashedPwd = await hashPassword(password);
    const newUser = new User({
      name,
      email,
      password: hashedPwd,
    });
    await newUser.save();

    // Send OTP email with error handling
    try {
      await sendAndStoreOtp(newUser.email);
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      // Delete the user if email fails to send
      try {
        await User.deleteOne({ _id: newUser._id });
        console.log(`Cleaned up user ${email} after email failure`);
      } catch (deleteError) {
        console.error("Failed to delete user after email error:", deleteError);
      }
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
      });
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
