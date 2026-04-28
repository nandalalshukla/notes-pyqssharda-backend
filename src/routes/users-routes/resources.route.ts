import { Router } from "express";
import { searchFromAllResources } from "../../controllers/user-controllers/searchFromAllResources.js";
import { searchSchema } from "../../validators/users-zod/search.zod.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";

const router = Router();

/**
 * Global Search Endpoint
 * Query params: query (required), resourceType (optional), page (optional), limit (optional)
 */
router.get("/search", validateMiddleware(searchSchema), searchFromAllResources);

export default router;
