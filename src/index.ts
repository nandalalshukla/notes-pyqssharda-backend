import "./config/env.js";
import express from "express";
import connectDB from "./config/db.js";
import authRouter from "./routes/users-routes/auth.route.js";


//connecting to the database
connectDB();

//initializing the main express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/auth", authRouter);

//default route to check if the server is running
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});


//to start the server
app.listen(process.env.PORT, () => {
  console.log(`Server started on http://localhost:${process.env.PORT}`);
});
