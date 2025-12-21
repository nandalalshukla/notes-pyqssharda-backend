import "./config/env.js";
import express from "express";
import connectDB from "./config/db.js";
import authRouter from "./routes/users-routes/auth.route.js";
import notesRouter from "./routes/notes-routes/notes.route.js";
import pyqsRouter from "./routes/pyqs-routes/pyqs.route.js";
import syllabusRouter from "./routes/syllabus-routes/syllabus.route.js";
import corsConfig from "./config/cors";
import cookieParser from "cookie-parser";
//middleware to parse cookies

//connecting to the database
connectDB();

//initializing the main express app
const app = express();

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(corsConfig);

//routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/notes", notesRouter);
app.use("/api/v1/pyqs", pyqsRouter);
app.use("/api/v1/syllabus", syllabusRouter);

//default route to check if the server is running
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

//to start the server
app.listen(process.env.PORT, () => {
  console.log(`Server started on http://localhost:${process.env.PORT}`);
});
