import { Router } from "express";
import { uploadProfilePicMulter } from "../../config/multer.js";

// Controllers
import { loginUser } from "../../controllers/user-controllers/login.js";
import { registerUser } from "../../controllers/user-controllers/register.js";
import {
  logout,
  logoutAll,
} from "../../controllers/user-controllers/logout.js";
import { changePassword } from "../../controllers/user-controllers/changePswd.js";
import { forgetPassword } from "../../controllers/user-controllers/forgetPswd.js";
import { createNewPassword } from "../../controllers/user-controllers/createNewPswd.js";
import verifyEmail from "../../controllers/user-controllers/verifyEmail.js";
import { getMe } from "../../controllers/user-controllers/loadAuth.js";
import { refreshAccessToken } from "../../controllers/user-controllers/refreshToken.js";
import { becomeModerator } from "../../controllers/user-controllers/becomeMod.js";
import { fetchContributors } from "../../controllers/user-controllers/fetchContributors.js";
import { deleteAccount } from "../../controllers/user-controllers/deleteAccount.js";
import { resendOtp } from "../../controllers/user-controllers/resendOtp.js";
import { deactivateAccount } from "../../controllers/user-controllers/deactivateAccount.js";
import {
  updateProfile,
  removeProfilePic,
} from "../../controllers/user-controllers/editProfile.js";

// Validators
import {
  registerSchema,
  passwordSchema,
  shardaEmailSchema,
} from "../../validators/users-zod/register.zod.js";
import { loginSchema } from "../../validators/users-zod/login.zod.js";
import { changePasswordSchema } from "../../validators/users-zod/changePswd.zod.js";
import {
  forgotPasswordSchema,
  createNewPasswordSchema,
} from "../../validators/users-zod/forgotPswd.zod.js";
import {
  verifyEmailSchema,
  resendOtpSchema,
} from "../../validators/users-zod/verifyEmail.zod.js";
import { editProfileSchema } from "../../validators/users-zod/editProfile.zod.js";
import { becomeModeratorSchema } from "../../validators/users-zod/becomeMod.zod.js";

// Middlewares
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import {
  authLimiter,
  uploadLimiter,
  interactionLimiter,
} from "../../middlewares/rateLimit/index.js";

const router = Router();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PUBLIC ROUTES (No Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Registration
router.post(
  "/register",
  authLimiter,
  validateMiddleware(registerSchema),
  registerUser,
);

// Login
router.post("/login", authLimiter, validateMiddleware(loginSchema), loginUser);

// Password Recovery
router.post(
  "/forgot-password",
  authLimiter,
  validateMiddleware(forgotPasswordSchema),
  forgetPassword,
);

router.post(
  "/reset-password",
  authLimiter,
  validateMiddleware(createNewPasswordSchema),
  createNewPassword,
);

// Email Verification
router.post(
  "/verify-email",
  authLimiter,
  validateMiddleware(verifyEmailSchema),
  verifyEmail,
);
router.post(
  "/resend-otp",
  authLimiter,
  validateMiddleware(resendOtpSchema),
  resendOtp,
);

// Fetch Contributors (Leaderboard)
router.get("/contributors", fetchContributors);

// Refresh Token
router.post("/refresh-token", authLimiter, refreshAccessToken);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROTECTED ROUTES (Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Get current user
router.get("/me", authMiddleware, getMe);

// Logout
router.post("/logout", authMiddleware, logout);
router.post("/logout-all", authMiddleware, logoutAll);

// Profile Management
router.put(
  "/profile",
  authMiddleware,
  uploadLimiter,
  uploadProfilePicMulter.single("profilePic"),
  validateMiddleware(editProfileSchema),
  updateProfile,
);

// Password Management
router.post(
  "/change-password",
  authMiddleware,
  authLimiter,
  validateMiddleware(changePasswordSchema),
  changePassword,
);

// Account Management
router.post("/deactivate", authMiddleware, authLimiter, deactivateAccount);
router.delete("/account", authMiddleware, authLimiter, deleteAccount);
router.delete("/profile-pic", authMiddleware, authLimiter, removeProfilePic);

// Moderator Request
router.post(
  "/request-mod",
  authMiddleware,
  interactionLimiter,
  validateMiddleware(becomeModeratorSchema),
  becomeModerator,
);

export default router;
