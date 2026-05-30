import "./config/env.js";
import express from "express";
import connectDB from "./config/db.js";

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
 * ERROR HANDLING MIDDLEWARE - Must be last
 * Catches all errors and prevents ECONNRESET from unhandled exceptions
 * ═══════════════════════════════════════════════════════════════════════════════
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[ERROR HANDLER]", err);

  // Prevent sending headers if already sent
  if (res.headersSent) {
    console.error("Headers already sent, delegating to Express error handler");
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { error: err.stack }),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
