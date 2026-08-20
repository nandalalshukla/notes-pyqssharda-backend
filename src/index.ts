import "./config/env.js";
import express from "express";
import helmet from "helmet";
import connectDB from "./config/db.js";
import { errorHandlerMiddleware } from "./middlewares/error/errorHandler.middleware.js";
import { NotFoundError } from "./utils/errors/AppError.js";

// Route Imports
import authRouter from "./routes/users-routes/auth.route.js";
import resourceRoutes from "./routes/users-routes/resources.route.js";
import notesRouter from "./routes/notes-routes/notes.route.js";
import pyqsRouter from "./routes/pyqs-routes/pyqs.route.js";
import syllabusRouter from "./routes/syllabus-routes/syllabus.route.js";
import adminRoutes from "./routes/admin-route/admin.routes.js";
import modRoutes from "./routes/mod-routes/mod.routes.js";
import socialRouter from "./routes/social-route/social.route.js";

// Config Imports
import corsConfig from "./config/cors.js";
import cookieParser from "cookie-parser";
import { globalLimiter } from "./middlewares/rateLimit/index.js";

connectDB();

const app = express();

app.set("trust proxy", 1);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE SETUP - Order matters!
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Standard security headers (X-Content-Type-Options, HSTS, no X-Powered-By,
// etc). CSP/COEP are disabled here: this is a pure JSON API with no HTML
// pages of its own, so a default CSP would only add noise, not protection —
// the frontend (which actually renders HTML) is a separate app/deployment.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS must be first to handle preflight requests
app.use(corsConfig);
app.options("/{*path}", corsConfig);

// Body parsing middleware
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));
app.use(cookieParser());

// Global rate limiter
app.use(globalLimiter);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROUTE REGISTRATION
 * All routes prefixed with /api/v1/
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// User & Authentication Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/resources", resourceRoutes);

// Content Management Routes
app.use("/api/v1/notes", notesRouter);
app.use("/api/v1/pyqs", pyqsRouter);
app.use("/api/v1/syllabus", syllabusRouter);

// Admin & Moderation Routes
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/mod", modRoutes);

// Social Features Routes
app.use("/api/v1/social", socialRouter);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HEALTH CHECK & SERVER STARTUP
 * ═══════════════════════════════════════════════════════════════════════════════
 */

app.get("/", (req, res) => {
  res.send(
    `<h1>Visit our official website <a href="https://www.sharda.social">sharda.social</a></h1>`,
  );
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 404 + ERROR HANDLING — must be registered last, in this order
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Anything that reached here matched no route above — respond with the
// same clean JSON error shape as everything else, instead of Express's
// default HTML 404 page.
app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
});

// See middlewares/error/errorHandler.middleware.ts — single place that
// turns any thrown error (ours or a library's) into a safe client response.
app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

// Last-resort safety nets: log full detail and exit so the process
// supervisor (Render/PM2/systemd) restarts a clean instance, rather than
// continuing to run in a possibly-corrupted state or dying silently with
// no log at all — either of which is worse than a clean, visible restart.
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("[UNCAUGHT EXCEPTION]", error);
  process.exit(1);
});
