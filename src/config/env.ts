import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

/**
 * Every variable the app actually reads, validated once at startup instead
 * of at first use deep inside a request. A missing required var now fails
 * loudly before the server ever accepts traffic, instead of surfacing as a
 * cryptic runtime error (or, worse, an unchecked `undefined` silently
 * reaching `jwt.sign()`/`mongoose.connect()`) the first time that code path
 * runs in production.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  MONGO_DB_NAME: z.string().min(1, "MONGO_DB_NAME is required"),

  ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  VERIFY_EMAIL_TOKEN_SECRET: z
    .string()
    .min(1, "VERIFY_EMAIL_TOKEN_SECRET is required"),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  APP_URL: z.string().url().optional(),
  SEND_MODERATOR_ALERTS: z.string().optional(),

  FRONTEND_URL: z.string().url().optional(),
  VERCEL_FRONTEND_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Secrets below this length are cryptographically weak for HS256 JWTs (an
// attacker can brute-force short shared secrets far faster than the token
// expiry). This only warns — it never blocks startup — because rejecting a
// short-but-already-deployed secret outright would take the app down
// instead of just flagging it, but it must not be ignored before shipping.
const MIN_SAFE_SECRET_LENGTH = 32;
const secretVars = [
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "VERIFY_EMAIL_TOKEN_SECRET",
] as const;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  for (const key of secretVars) {
    if (parsed.data[key].length < MIN_SAFE_SECRET_LENGTH) {
      console.warn(
        `⚠️  ${key} is only ${parsed.data[key].length} characters — use at least ${MIN_SAFE_SECRET_LENGTH} random characters (e.g. \`openssl rand -hex 32\`) before deploying to production.`,
      );
    }
  }

  return parsed.data;
}

export const env = loadEnv();
