import "./config/env.js";
import express from "express";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./config/db.js";
import authRouter from "./routes/users-routes/auth.route.js";
import notesRouter from "./routes/notes-routes/notes.route.js";
import pyqsRouter from "./routes/pyqs-routes/pyqs.route.js";
import syllabusRouter from "./routes/syllabus-routes/syllabus.route.js";
import adminRoutes from "./routes/admin-route/admin.routes.js";
import resourceRoutes from "./routes/users-routes/resources.route.js";
import modRoutes from "./routes/mod-routes/mod.routes.js";
import chatbotRouter from "./routes/users-routes/chatbot.route.js";
import socialRoutes from "./routes/shardasocial-routes/social.routes.js";
import corsConfig from "./config/cors.js";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler.js";
import { sendError } from "./utils/apiResponse.js";

// Connecting to the database
connectDB();

// Initializing the main express app
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(corsConfig);
app.use(helmet());
app.use(mongoSanitize());

// Routes - Library System
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/notes", notesRouter);
app.use("/api/v1/pyqs", pyqsRouter);
app.use("/api/v1/syllabus", syllabusRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/mod", modRoutes);
app.use("/api/v1/resources", resourceRoutes);
app.use("/api/v1/chatbot", chatbotRouter);

// Routes - Social Networking Platform
app.use("/api/v1/social", socialRoutes);

// Default route to check if the server is running
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// 404 handler
app.use((req, res) => {
  return sendError(res, 404, "Route not found", "NOT_FOUND");
});

// Error handling middleware (catch-all)
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
