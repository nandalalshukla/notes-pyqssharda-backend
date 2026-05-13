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

connectDB();

const app = express();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE SETUP - Order matters!
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// CORS must be first to handle preflight requests
app.use(corsConfig);
app.options("/{*path}", corsConfig);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
