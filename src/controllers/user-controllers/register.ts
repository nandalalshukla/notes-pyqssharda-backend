import { User } from "../../models/users/user.model.js";
import { Request, Response } from "express";
import { sendAndStoreOtp } from "../../utils/Otp.js";
import { generateEmailVerifyToken } from "../../utils/generateJwtTokens.js";
import { hashPassword } from "../../utils/hashPassword.js";

export const registerUser = async (req: Request, res: Response) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  try {
    // Single query to check both duplicates at once
    const existingUser = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return res.status(409).json({
        success: false,
        message: `An account with this ${field} already exists`,
      });
    }

    const hashedPwd = await hashPassword(password);

    const newUser = new User({
      name,
      username: username.toLowerCase(),
      email,
      password: hashedPwd,
    });

    await newUser.save();

    // Send OTP in background — non-blocking
    sendAndStoreOtp(newUser.email)
      .then(() => console.log(`✅ OTP sent successfully to ${email}`))
      .catch((emailError) => {
        console.error("⚠️ Failed to send OTP email:", emailError);
        console.error("User can request resend OTP later.");
      });

    const verifyToken = generateEmailVerifyToken(newUser._id.toString());

    return res.status(201).json({
      success: true,
      verifyToken,
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          isEmailVerified: false,
        },
      },
      message: "Account created successfully, please verify your email",
    });
  } catch (error: any) {
    // Catch mongo duplicate key errors as a safety net
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `An account with this ${field} already exists`,
      });
    }

    console.error("Error registering user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
