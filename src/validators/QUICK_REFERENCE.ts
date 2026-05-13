/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUICK REFERENCE: VALIDATOR SCHEMA MAP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file serves as a quick lookup for all available validators and their usage
 */

/**
 * USER & AUTHENTICATION SCHEMAS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Registration & Login
import { registerSchema } from "./users-zod/register.zod";
import { loginSchema } from "./users-zod/login.zod";
import type { RegisterInput } from "./users-zod/register.zod";
import type { LoginInput } from "./users-zod/login.zod";

// Password Management
import {
  changePasswordSchema,
  passwordSchema,
  shardaEmailSchema,
} from "./users-zod";
import { forgotPasswordSchema, createNewPasswordSchema } from "./users-zod";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  CreateNewPasswordInput,
} from "./users-zod";

// Email Verification
import { verifyEmailSchema, resendOtpSchema } from "./users-zod";
import type { VerifyEmailInput, ResendOtpInput } from "./users-zod";

// Profile & Preferences
import { editProfileSchema } from "./users-zod";
import { becomeModeratorSchema } from "./users-zod";
import type { EditProfileInput } from "./users-zod";

// Search
import { searchSchema } from "./users-zod";
import type { SearchInput } from "./users-zod";

/**
 * ADMIN SCHEMAS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { reviewModRequestSchema, modRequestParamsSchema } from "./admin-zod";
import { deleteNoteParamsSchema } from "./admin-zod";
import { deletePYQParamsSchema } from "./admin-zod";
import { deleteSyllabusParamsSchema } from "./admin-zod";
import { deleteUserParamsSchema } from "./admin-zod";
import type {
  ReviewModRequestInput,
  DeleteNoteParams,
  DeletePYQParams,
  DeleteSyllabusParams,
  DeleteUserParams,
} from "./admin-zod";

/**
 * MODERATOR SCHEMAS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { rejectNoteSchema, noteParamsSchema } from "./mods-zod";
import { rejectPYQSchema, pyqParamsSchema } from "./mods-zod";
import { rejectSyllabusSchema, syllabusParamsSchema } from "./mods-zod";
import type {
  RejectNoteInput,
  RejectPYQInput,
  RejectSyllabusInput,
  NoteParams,
  PYQParams,
  SyllabusParams,
} from "./mods-zod";

/**
 * RESOURCES SCHEMAS (NOTES, PYQS, SYLLABUS)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Notes
import {
  notesSchema,
  updateNotesSchema,
  notesQuerySchema,
  resourceMetadataSchema,
} from "./notes-zod";
import type {
  NotesInput,
  UpdateNotesInput,
  NotesQueryInput,
} from "./notes-zod";

// PYQs
import { pyqsSchema, updatePYQsSchema, pyqsQuerySchema } from "./pyqs-zod";
import type { PYQsInput, UpdatePYQsInput, PYQsQueryInput } from "./pyqs-zod";

// Syllabus
import {
  syllabusSchema,
  updateSyllabusSchema,
  syllabusQuerySchema,
} from "./syllabus-zod";
import type {
  SyllabusInput,
  UpdateSyllabusInput,
  SyllabusQueryInput,
} from "./syllabus-zod";

/**
 * SOCIAL SCHEMAS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Posts
import {
  createPostSchema,
  editPostSchema,
  postParamsSchema,
} from "./social-zod";
import type { CreatePostInput, EditPostInput, PostParams } from "./social-zod";

// Comments
import {
  createCommentSchema,
  editCommentSchema,
  commentParamsSchema,
  getCommentsSchema,
} from "./social-zod";
import type {
  CreateCommentInput,
  EditCommentInput,
  CommentParams,
  GetCommentsInput,
} from "./social-zod";

// Likes
import { likeActionSchema, likeParamsSchema } from "./social-zod";
import type { LikeActionInput, LikeParams } from "./social-zod";

// Follow
import { followActionSchema, followListSchema } from "./social-zod";
import type { FollowActionInput, FollowListInput } from "./social-zod";

// Notifications
import {
  notificationParamsSchema,
  getNotificationsSchema,
  markNotificationReadSchema,
} from "./social-zod";
import type {
  NotificationParams,
  GetNotificationsInput,
  MarkNotificationReadInput,
} from "./social-zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMMON PATTERNS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Pattern 1: Validate Request Body in Controller
 */
export const patternValidateBody = () => {
  /*
  import { loginSchema } from "@/lib/validators";
  
  export const loginUser = async (req: Request, res: Response) => {
    const result = loginSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten(),
      });
    }
    
    const { email, password } = result.data;
    // Continue with logic...
  };
  */
};

/**
 * Pattern 2: Validate Path Parameters
 */
export const patternValidateParams = () => {
  /*
  import { deleteNoteParamsSchema } from "@/lib/validators";
  
  export const deleteNote = async (req: Request, res: Response) => {
    const paramsResult = deleteNoteParamsSchema.safeParse(req.params);
    
    if (!paramsResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
    }
    
    const { noteId } = paramsResult.data;
    // Continue with deletion logic...
  };
  */
};

/**
 * Pattern 3: Validation Middleware
 */
export const patternValidationMiddleware = () => {
  /*
  import { ZodSchema } from "zod";
  
  export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.error.flatten(),
        });
      }
      
      req.body = result.data;
      next();
    };
  };
  
  // Usage in routes
  router.post("/login", validateRequest(loginSchema), loginUser);
  */
};

/**
 * Pattern 4: Type-Safe Function Parameters
 */
export const patternTypeAware = () => {
  /*
  import { RegisterInput, LoginInput } from "@/lib/validators";
  
  function createUser(data: RegisterInput) {
    // TypeScript knows:
    // - data.name: string
    // - data.username: string
    // - data.email: string (Sharda domain validated)
    // - data.password: string (strong password)
  }
  
  function authenticateUser(credentials: LoginInput) {
    // TypeScript knows:
    // - credentials.email: string (Sharda domain)
    // - credentials.password: string
  }
  */
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCHEMA FEATURES SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Reusable Base Schemas
 * └─ passwordSchema: Strong password validation (6+ chars, uppercase, lowercase, number, special char)
 * └─ shardaEmailSchema: Sharda University email validation (*.ug.sharda.ac.in)
 * └─ resourceMetadataSchema: Course metadata (program, courseCode, courseName, semester)
 *
 * Validation Features
 * └─ String trimming & formatting (toLowerCase, trim)
 * └─ Min/Max length validation
 * └─ Regex pattern matching (emails, phone numbers, course codes)
 * └─ URL validation
 * └─ Enum validation
 * └─ Cross-field validation (password confirmation, etc.)
 * └─ Pagination (page, limit with ranges)
 * └─ MongoDB ObjectId validation
 * └─ Type transformations (string to number, JSON parsing)
 * └─ Custom error messages
 *
 * Common Field Validations
 * └─ Email: Sharda University domain specific
 * └─ Password: Min 6 chars + uppercase + lowercase + number + special
 * └─ Phone: 10 digits only
 * └─ OTP: 6 digits only
 * └─ Semester: 1-12
 * └─ Year: 2000 to current year
 * └─ Course Code: 2-20 alphanumeric characters
 * └─ Names: 3-50 letters + spaces only
 * └─ Usernames: 3-30 alphanumeric + underscore + hyphen
 * └─ Bio/Text: Supports up to 500-1000 characters
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USAGE BY CONTROLLER TYPE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * User Controller
 * ├─ register: registerSchema, RegisterInput
 * ├─ login: loginSchema, LoginInput
 * ├─ changePassword: changePasswordSchema, ChangePasswordInput
 * ├─ forgotPassword: forgotPasswordSchema, ForgotPasswordInput
 * ├─ createNewPassword: createNewPasswordSchema, CreateNewPasswordInput
 * ├─ verifyEmail: verifyEmailSchema, VerifyEmailInput
 * ├─ resendOtp: resendOtpSchema, ResendOtpInput
 * ├─ editProfile: editProfileSchema, EditProfileInput
 * ├─ becomeModerator: becomeModeratorSchema, BecomeModerator​Input
 * └─ search: searchSchema, SearchInput
 */

/**
 * Admin Controller
 * ├─ reviewModRequest: reviewModRequestSchema, modRequestParamsSchema
 * ├─ deleteNote: deleteNoteParamsSchema
 * ├─ deletePYQ: deletePYQParamsSchema
 * ├─ deleteSyllabus: deleteSyllabusParamsSchema
 * └─ deleteUser: deleteUserParamsSchema
 */

/**
 * Moderator Controller
 * ├─ rejectNote: rejectNoteSchema, noteParamsSchema
 * ├─ rejectPYQ: rejectPYQSchema, pyqParamsSchema
 * └─ rejectSyllabus: rejectSyllabusSchema, syllabusParamsSchema
 */

/**
 * Resource Controllers (Notes/PYQs/Syllabus)
 * ├─ uploadNotes/PYQ/Syllabus: notesSchema / pyqsSchema / syllabusSchema
 * ├─ updateNotes/PYQ/Syllabus: updateNotesSchema / updatePYQsSchema / updateSyllabusSchema
 * └─ queryNotes/PYQs/Syllabus: notesQuerySchema / pyqsQuerySchema / syllabusQuerySchema
 */

/**
 * Social Controller
 * ├─ createPost: createPostSchema, postParamsSchema
 * ├─ editPost: editPostSchema, postParamsSchema
 * ├─ createComment: createCommentSchema
 * ├─ editComment: editCommentSchema, commentParamsSchema
 * ├─ getComments: getCommentsSchema
 * ├─ likeAction: likeActionSchema
 * ├─ followAction: followActionSchema, followListSchema
 * └─ notification: notificationParamsSchema, getNotificationsSchema, markNotificationReadSchema
 */

export {};
