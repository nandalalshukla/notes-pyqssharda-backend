import cors from "cors";
import { env } from "./env.js";
import { ForbiddenError } from "../utils/errors/AppError.js";

const allowedOrigins: (string | RegExp)[] = [
  env.VERCEL_FRONTEND_URL,
  env.FRONTEND_URL, // Production frontend
  "http://localhost:3000", // Local development (default Next.js port)
  "http://localhost:3100", // Local development (custom port)
  // The live site. Both hosts are allowed because both resolve; the www
  // one is expected to 301 to the apex, but a request that arrives before
  // that redirect still needs to work.
  "https://sharda.social",
  "https://www.sharda.social",
  // The old Vercel host, kept so existing deploy previews and any stale
  // bookmarks keep functioning.
  "https://notes-pyqssharda.vercel.app",
  /^https:\/\/res\.cloudinary\.com$/, // Cloudinary CDN
].filter(Boolean) as (string | RegExp)[]; // Remove any undefined values

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      // Exact match only — `startsWith` would also let
      // "http://localhost:3000.attacker.example" through since it has the
      // allowed origin as a literal string prefix.
      return origin === allowedOrigin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      // A plain Error here would fall through the error handler's "unknown
      // error" branch — a 500, logged as `[ERROR]` alongside real bugs. A
      // disallowed origin is routine (bots, misconfigured clients) and
      // fully expected, so it gets its own operational AppError → a clean
      // 403 the client can act on, logged quietly instead of paging anyone.
      callback(new ForbiddenError("This origin is not allowed to access this API."));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

export default cors(corsOptions);
