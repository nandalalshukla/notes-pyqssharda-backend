import "./config/env.js";
import express from "express";
import connectDB from "./config/db.js";
import registerRouter from "./routes/users-routes/register.route.js";
import loginRouter from "./routes/users-routes/login.route.js";
import verifyEmailRouter from "./routes/users-routes/verifyEmail.route.js";

//connecting to the database
connectDB();

//initializing the main express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});
app.use("/api/auth", registerRouter);
app.use("/api/auth", verifyEmailRouter);
app.use("/api/auth", loginRouter);

//to start the server
app.listen(process.env.PORT, () => {
  console.log(`Server started on http://localhost:${process.env.PORT}`);
});
