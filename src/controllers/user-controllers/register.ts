import { User } from "../../models/users/user.model.js";
import { Request, Response } from "express";
import { sendAndStoreOtp } from "../../utils/Otp.js";
import { hashPassword } from "../../utils/hashPassword.js";
import { BadRequestError, ConflictError } from "../../utils/errors/AppError.js";

export const registerUser = async (req: Request, res: Response) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    throw new BadRequestError("All fields are required");
  }

  // Single query to check both duplicates at once
  const existingUser = await User.findOne({
    $or: [{ email }, { username: username.toLowerCase() }],
  });

  if (existingUser) {
    const field = existingUser.email === email ? "email" : "username";
    throw new ConflictError(`An account with this ${field} already exists`);
  }

  const hashedPwd = await hashPassword(password);

  const newUser = new User({
    name,
    username: username.toLowerCase(),
    email,
    password: hashedPwd,
  });

  // A duplicate-key race (two concurrent registrations for the same
  // email/username slipping past the findOne check above) is now handled
  // centrally by errorHandler.middleware.ts — no local 11000 special-case
  // needed here.
  await newUser.save();

  // Send OTP in background — non-blocking
  sendAndStoreOtp(newUser.email)
    .then(() => console.log(`✅ OTP sent successfully to ${email}`))
    .catch((emailError) => {
      console.error("⚠️ Failed to send OTP email:", emailError);
      console.error("User can request resend OTP later.");
    });

  return res.status(201).json({
    success: true,
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
};
