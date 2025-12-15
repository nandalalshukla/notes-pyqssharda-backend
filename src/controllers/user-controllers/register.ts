import { User } from "../../models/users/user.model";
import { Request, Response } from "express";
import { sendAndStoreOtp } from "../../utils/Otp";
import { generateVerifyToken } from "../../utils/generateJwtTokens";
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password, confirmPassword } = req.body;
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
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
    const newUser = new User({
      name,
      email,
      password,
    });
    await newUser.save();
    await sendAndStoreOtp(newUser.email);
    const verifyToken = generateVerifyToken((newUser._id).toString());
    return res.status(201).json({
      success: true,
      verifyToken,
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
