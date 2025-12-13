import "./config/env.js";
import express from "express";

//initializing the main express app
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

//to start the server
app.listen(process.env.PORT, () => {
  console.log(`Server started on http://localhost:${process.env.PORT}`);
});
