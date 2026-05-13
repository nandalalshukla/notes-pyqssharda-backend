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
export * from "./users-zod";

// Admin Management Validators
export * from "./admin-zod";

// Moderator Management Validators
export * from "./mods-zod";

// Resource Validators (Notes, PYQs, Syllabus)
export * from "./notes-zod";
export * from "./pyqs-zod";
export * from "./syllabus-zod";

// Social & Community Validators
export * from "./social-zod";
