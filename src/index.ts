import "./config/env.js";
import express from "express";
import connectDB from "./config/db.js";
import authRouter from "./routes/users-routes/auth.route.js";
import notesRouter from "./routes/notes-routes/notes.route.js";
import pyqsRouter from "./routes/pyqs-routes/pyqs.route.js";
import syllabusRouter from "./routes/syllabus-routes/syllabus.route.js";
import adminRoutes from "./routes/admin-route/admin.routes.js";
import resourceRoutes from "./routes/users-routes/resources.route.js";
import modRoutes from "./routes/mod-routes/mod.routes.js";
import corsConfig from "./config/cors.js";
import cookieParser from "cookie-parser";

connectDB();

const app = express();

// ✅ CORS must be first
app.use(corsConfig);
app.options("/{*path}", corsConfig); // ✅ preflight handler

// Then everything else
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/notes", notesRouter);
app.use("/api/v1/pyqs", pyqsRouter);
app.use("/api/v1/syllabus", syllabusRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/mod", modRoutes);
app.use("/api/v1/resources", resourceRoutes);

app.get("/", (req, res) => {
  res.send(`<h1>Visit our official website <a href="https://www.sharda.social">sharda.social</a></h1>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
