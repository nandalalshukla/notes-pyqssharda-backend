import { User } from "../../models/sharda-social/user.model.js";
import { Request, Response } from "express";
import { sendAndStoreOtp } from "../../utils/Otp.js";
import { hashPassword } from "../../utils/hashPassword.js";
import { registerSchema } from "../../validators/social-zod/social.zod.js";

export const registerUser = async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    username,
    course,
    contactNo,
    bio,
    profilePic,
  } = req.body;

  // Validate input with Zod schema
  try {
    registerSchema.parse({
      name,
      email,
      password,
      username,
      course,
      contactNo,
      bio,
      profilePic,
    });
  } catch (validationError: any) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: validationError.errors,
    });
  }

  try {
    // Check if user with email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Generate or use provided username
    let finalUsername = username;
    if (!finalUsername) {
      // Auto-generate username from email if not provided
      const baseUsername = email.split("@")[0].toLowerCase();
      finalUsername = baseUsername;
      let counter = 1;

      // Ensure unique username
      while (await User.findOne({ username: finalUsername })) {
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }
    } else {
      // Check if provided username is unique
      const existingUsername = await User.findOne({ username: finalUsername });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: "Username already taken",
        });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user with all available data
    const newUser = new User({
      name,
      email,
      username: finalUsername,
      password: hashedPassword,
      course: course || "",
      contactNo: contactNo || null,
      bio: bio || "",
      profilePic: profilePic || { url: "", publicId: null },
      isEmailVerified: false,
      role: "user", // Default role for new users
      followersCount: 0,
      followingCount: 0,
      isActive: true,
    });

    await newUser.save();

    // Send OTP email asynchronously (non-blocking)
    sendAndStoreOtp(newUser.email)
      .then(() => console.log(`✅ OTP sent to ${email}`))
      .catch((err) => {
        console.error(`⚠️ Failed to send OTP to ${email}:`, err);
        // User can request resend OTP from the verify email endpoint
      });

    // Prepare response without sensitive data
    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.emailOtpHash;
    delete userResponse.forgotPasswordToken;

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: userResponse._id,
          name: userResponse.name,
          email: userResponse.email,
          username: userResponse.username,
          role: userResponse.role,
          bio: userResponse.bio,
          course: userResponse.course,
          contactNo: userResponse.contactNo,
          profilePic: userResponse.profilePic,
          followersCount: userResponse.followersCount,
          followingCount: userResponse.followingCount,
          isEmailVerified: userResponse.isEmailVerified,
          isActive: userResponse.isActive,
          createdAt: userResponse.createdAt,
        },
      },
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
