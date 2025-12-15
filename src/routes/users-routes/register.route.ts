import { Router } from "express";
import { registerUser } from "../../controllers/user-controllers/register";

const router = Router();


router.post("/register", registerUser);


export default router;