import { Router } from "express";
import verifyEmail from "../../controllers/user-controllers/verifyEmail";

const router = Router();


router.post("/verify-email",verifyEmail);

export default router;