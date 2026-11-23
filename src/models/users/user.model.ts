import mongoose, { Schema } from "mongoose";
import { UNVERIFIED_ACCOUNT_TTL_MS } from "../../config/auth.js";

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
      validate: {
        validator: (username: string) => username !== "everyone",
        message: "This username is reserved",
      },
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

    // 🔹 Privacy — what other students may see on this user's public
    // profile. Every flag defaults to `true` so existing accounts keep
    // behaving exactly as they did before these settings existed; a user
    // opts *out* of sharing, never in. Enforced server-side in
    // getProfile / getLikes / fetchContributors — never by the client.
    privacy: {
      showEmail: {
        type: Boolean,
        default: true,
      },
      showContactNo: {
        type: Boolean,
        default: true,
      },
      showCourse: {
        type: Boolean,
        default: true,
      },
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
      index: true, // sorted on by fetchContributors.ts (leaderboard)
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

    // Present only while registration is unverified. The TTL index is
    // created explicitly after the legacy-data backfill in config/db.ts;
    // verified accounts have this field unset and are never TTL candidates.
    verificationExpiresAt: {
      type: Date,
      select: false,
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

    emailOtpPurpose: {
      type: String,
      enum: ["email-verification", "password-reset"],
      select: false,
    },

    emailOtpSentAt: {
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
  delete obj.emailOtpExpiry;
  delete obj.emailOtpPurpose;
  delete obj.emailOtpSentAt;
  delete obj.verificationExpiresAt;
  delete obj.forgotPasswordToken;
  return obj;
};

export const User = mongoose.model("User", userSchema);

/**
 * Backfill legacy pending registrations before enabling the TTL index.
 * Existing users expire 24 hours after their original creation time; users
 * without a valid createdAt value receive a full 24-hour migration grace.
 * The filter makes this safe to run on every application start and from
 * multiple application instances at once.
 */
export async function ensureUnverifiedAccountExpiry() {
  const now = new Date();
  const result = await User.collection.updateMany(
    {
      isEmailVerified: { $ne: true },
      verificationExpiresAt: null,
    },
    [
      {
        $set: {
          verificationExpiresAt: {
            $add: [{ $ifNull: ["$createdAt", now] }, UNVERIFIED_ACCOUNT_TTL_MS],
          },
        },
      },
    ],
  );

  const indexName = "verificationExpiresAt_ttl";
  await User.collection.createIndex(
    { verificationExpiresAt: 1 },
    { expireAfterSeconds: 0, name: indexName },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `Backfilled verification expiry for ${result.modifiedCount} unverified account(s)`,
    );
  }
}
