import { Router } from "express";

//import controllers
import { loginUser } from "../../controllers/shardasocial-controllers/login.js";
import { registerUser } from "../../controllers/shardasocial-controllers/register.js";
import { logout } from "../../controllers/shardasocial-controllers/logout.js";
import { changePassword } from "../../controllers/shardasocial-controllers/changePswd.js";
import { forgetPassword } from "../../controllers/shardasocial-controllers/forgetPswd.js";
import { createNewPassword } from "../../controllers/shardasocial-controllers/createNewPswd.js";
import verifyEmail from "../../controllers/shardasocial-controllers/verifyEmail.js";
import { getMe } from "../../controllers/shardasocial-controllers/loadAuth.js";
import { refreshAccessToken } from "../../controllers/shardasocial-controllers/refreshToken.js";
import { becomeModerator } from "../../controllers/shardasocial-controllers/becomeMod.js";
import { fetchContributors } from "../../controllers/shardasocial-controllers/fetchContributors.js";

//import zod schemas
import { loginSchema } from "../../validators/users-zod/login.zod.js";
import { registerSchema } from "../../validators/users-zod/register.zod.js";
import { changePasswordSchema } from "../../validators/users-zod/changePswd.zod.js";
import {
  createNewPasswordSchema,
  forgotPasswordSchema,
} from "../../validators/users-zod/forgotPswd.zod.js";

//import middlewares
import { validateRequest } from "../../middleware/validateRequest.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";

const router = Router();

//pubic routes
//signup
router.post("/register", validateRequest(registerSchema), registerUser);

//login (rate limited)
router.post("/login", validateRequest(loginSchema), loginUser);

//forgot password
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  forgetPassword,
);

//reset password
router.post(
  "/reset-password",
  validateRequest(createNewPasswordSchema),
  createNewPassword,
);

// verify email
router.post("/verify-email", verifyEmail);

//protected rotues
//logout
router.post("/logout", logout);

//change password
router.post(
  "/change-password",
  validateRequest(changePasswordSchema),
  authMiddleware,
  changePassword,
);

//get logged in user details on app load
router.get("/me", authMiddleware, getMe);

//refresh token route
router.post("/refresh-token", refreshAccessToken);

//mod request route
router.post("/request-mod", authMiddleware, becomeModerator);

//fetch contributors/leaderboard
router.get("/contributors", fetchContributors);

export default router;
