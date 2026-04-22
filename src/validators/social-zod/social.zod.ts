import { z } from "zod";

// ============ AUTH VALIDATORS ============

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name cannot exceed 50 characters" }),

  email: z
    .string()
    .email({ message: "Invalid email format" })
    .regex(/^[a-zA-Z0-9._%+-]+@ug\.sharda\.ac\.in$/, {
      message: "Only Sharda University emails (@ug.sharda.ac.in) are allowed",
    }),

  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one digit" })
    .regex(/[!@#$%^&*(),.?\":{}|<>]/, {
      message: "Password must contain at least one special character",
    }),

  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(20, { message: "Username cannot exceed 20 characters" })
    .regex(/^[a-z0-9._]+$/, {
      message:
        "Username can only contain lowercase letters, numbers, dots and underscores",
    })
    .optional(),

  course: z
    .string()
    .max(100, { message: "Course cannot exceed 100 characters" })
    .optional(),

  contactNo: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, { message: "Invalid contact number" })
    .optional(),

  bio: z
    .string()
    .max(200, { message: "Bio cannot exceed 200 characters" })
    .optional(),

  profilePic: z
    .object({
      url: z
        .string()
        .url({ message: "Invalid profile picture URL" })
        .optional(),
      publicId: z.string().optional(),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),

  password: z.string().min(1, { message: "Password is required" }),
});

// ============ POST VALIDATORS ============

export const createPostSchema = z
  .object({
    content: z
      .string()
      .max(500, { message: "Post content cannot exceed 500 characters" })
      .optional(),

    media: z
      .array(
        z.object({
          type: z.enum(["image", "video"]),
          url: z.string().url({ message: "Invalid media URL" }),
          publicId: z.string(),
          thumbnail: z.string().url().optional(),
        }),
      )
      .max(5, { message: "Maximum 5 media files allowed" })
      .optional(),
  })
  .refine((data) => data.content || (data.media && data.media.length > 0), {
    message: "Post must have content or media",
  });

export const updatePostSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Content cannot be empty" })
    .max(500, { message: "Post content cannot exceed 500 characters" }),
});

// ============ COMMENT VALIDATORS ============

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment cannot exceed 1000 characters" }),

  parentCommentId: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment cannot exceed 1000 characters" }),
});

// ============ PROFILE VALIDATORS ============

export const updateProfileSchema = z.object({
  bio: z
    .string()
    .max(200, { message: "Bio cannot exceed 200 characters" })
    .optional(),

  course: z.string().optional(),

  contactNo: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, { message: "Invalid contact number" })
    .optional(),

  profilePicUrl: z.string().url().optional(),

  profilePicPublicId: z.string().optional(),
});

// ============ SHARE VALIDATORS ============

export const sharePostSchema = z.object({
  reshareNote: z
    .string()
    .max(500, { message: "Reshare note cannot exceed 500 characters" })
    .optional(),
});

// ============ MOD REQUEST VALIDATORS ============

export const createModRequestSchema = z.object({
  motivation: z
    .string()
    .min(10, { message: "Explain properly why you want to be a moderator" })
    .max(500, { message: "Motivation cannot exceed 500 characters" }),
});

export const rejectModRequestSchema = z.object({
  reason: z
    .string()
    .min(1, { message: "Rejection reason is required" })
    .max(300, { message: "Reason cannot exceed 300 characters" }),
});

export default {
  registerSchema,
  loginSchema,
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  updateCommentSchema,
  updateProfileSchema,
  sharePostSchema,
  createModRequestSchema,
  rejectModRequestSchema,
};
