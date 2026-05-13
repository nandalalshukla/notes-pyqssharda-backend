import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    // 🔹 Basic Info
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username must be at most 20 characters"],
      match: [
        /^[a-z0-9._]+$/,
        "Username can only contain lowercase letters, numbers, dots and underscores",
      ],
      index: true,
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
      select: false,
    },

    // 🔹 Role / Permissions
    role: {
      type: String,
      enum: ["user", "mod", "admin"],
      default: "user",
      index: true,
    },

    // 🔹 Profile
    bio: {
      type: String,
      trim: true,
      maxlength: [200, "Bio cannot exceed 200 characters"],
      default: "",
    },
    profilePic: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: null,
      },
    },

    course: {
      type: String,
      trim: true,
      default: "",
    },

    contactNo: {
      type: String,
      trim: true,
      default: null,
    },

    // 🔹 Social Metrics (IMPORTANT: counts only, no arrays)
    followersCount: {
      type: Number,
      default: 0,
    },

    followingCount: {
      type: Number,
      default: 0,
    },

    contributions: {
      type: Number,
      default: 0,
    },

    // 🔹 Account State
    isActive: {
      type: Boolean,
      default: true,
      select: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // 🔹 Security / Auth Flows
    passwordChangedAt: Date,

    modRequest: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: null,
      index: true,
    },

    modMotivation: {
      type: String,
      trim: true,
      default: null,
    },

    modRequestAt: {
      type: Date,
      default: null,
    },

    emailOtpHash: {
      type: String,
      select: false,
    },

    emailOtpExpiry: {
      type: Date,
      select: false,
    },

    forgotPasswordToken: {
      type: String,
      select: false,
    },

    forgotPasswordExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailOtpHash;
  delete obj.forgotPasswordToken;
  return obj;
};

export const User = mongoose.model("User", userSchema);
