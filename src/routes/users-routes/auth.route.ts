import { Router } from "express";

//import controllers
import { loginUser } from "../../controllers/user-controllers/login";
import { registerUser } from "../../controllers/user-controllers/register";
import { logout } from "../../controllers/user-controllers/logout";
import { changePassword } from "../../controllers/user-controllers/changePswd";
import { forgetPassword } from "../../controllers/user-controllers/forgetPswd";
import { createNewPassword } from "../../controllers/user-controllers/createNewPswd";
import verifyEmail from "../../controllers/user-controllers/verifyEmail";
import { getMe } from "../../controllers/user-controllers/loadAuth";
import { refreshAccessToken } from "../../controllers/user-controllers/refreshToken";

//import zod schemas
import { loginSchema } from "../../validators/users-zod/login.zod";
import { registerSchema } from "../../validators/users-zod/register.zod";
import { changePasswordSchema } from "../../validators/users-zod/changePswd.zod";
import {
  createNewPasswordSchema,
  forgotPasswordSchema,
} from "../../validators/users-zod/forgotPswd.zod";

//import middlewares
import { validateMiddleware } from "../../middlewares/auth/validate.middleware";
import { authMiddleware } from "../../middlewares/auth/auth.middleware";

const router = Router();

//pubic routes
//signup
router.post("/register", validateMiddleware(registerSchema), registerUser);

//login (rate limited)
router.post("/login", validateMiddleware(loginSchema), loginUser);

//forgot password
router.post(
  "/forgot-password",
  validateMiddleware(forgotPasswordSchema),
  forgetPassword
);

//reset password
router.post(
  "/reset-password",
  validateMiddleware(createNewPasswordSchema),
  createNewPassword
);

// verify email
router.post("/verify-email", verifyEmail);

//protected rotues
//logout
router.post("/logout",logout);

//change password
router.post(
  "/change-password",
  validateMiddleware(changePasswordSchema),
  authMiddleware,
  changePassword
);

//get logged in user details on app load
router.get("/me", authMiddleware, getMe);

//refresh token route
router.post("/refresh-token", refreshAccessToken);

export default router;
