/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE VALIDATORS INDEX
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file provides centralized imports for all Zod validation schemas across
 * the application. Schemas are organized by domain/feature for maintainability.
 *
 * USAGE EXAMPLES:
 * ───────────────
 *
 * 1. Import specific validator:
 *    import { loginSchema } from "@validators/users-zod";
 *
 * 2. Import entire category:
 *    import * as adminValidators from "@validators/admin-zod";
 *
 * 3. Import with alias:
 *    import { registerSchema as signUpSchema } from "@validators/users-zod";
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// User & Authentication Validators
export * from "./users-zod/index.js";

// Admin Management Validators
export * from "./admin-zod/index.js";

// Moderator Management Validators
export * from "./mods-zod/index.js";

// Resource Validators (Notes, PYQs, Syllabus)
export * from "./notes-zod/index.js";
export * from "./pyqs-zod/index.js";
export * from "./syllabus-zod/index.js";

// Social & Community Validators
export * from "./social-zod/index.js";
