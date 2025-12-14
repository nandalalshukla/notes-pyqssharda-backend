import mongoose, { Schema } from "mongoose";


const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },


    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@ug\.sharda\.ac\.in$/,
        "Only sharda university emails are allowed",
      ],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // 🔐 never return password
    },

    passwordChangedAt: Date,

    role: {
      type: String,
      enum: ["student", "moderator", "admin"],
      default: "student",
    },

    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    emailVerificationExpiry: Date,


    forgotPasswordToken: {
      type: String,
      select: false,
    },

    forgotPasswordExpiry: Date,
  
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);