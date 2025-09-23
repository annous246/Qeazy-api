const express = require("express");
app = express();
const bp = require("body-parser");
const cors = require("cors");
const http = require("http");
const path = require("path");
const socketBuilder = require("socket.io");
const server = http.createServer(app);
const io = socketBuilder(server);
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many Requests, please try again later",
});
server.listen(process.env.PORT, () =>
  console.log(`listening on port ${process.env.PORT}`)
);
app.use(
  cors({
    origin: ["https://qeazy-1c76.onrender.com", "http://localhost:5173"],
    // React app URL
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Allowed methods
  })
);

app.use(bp.urlencoded({ extended: false }));
app.use(bp.json());

app.use("/split_pdfs", express.static(path.join(__dirname, "split_pdfs")));
const fl = async (file, d, q, c) => {
  const { runMCQ } = await import("./AI_service/Ai_image_servicem.mjs");
  const res = await runMCQ(file, d, q, c);
  return res;
};
app.get("/", (req, res) => {
  res.json({ message: "listening" });
});
app.post("/api/upload", upload.array("pdf"), async (req, res) => {
  const filePaths = [];
  if (!req.files || !req.files.length) return res.json(null);
  for (const file of req.files) {
    console.log(file);
    await filePaths.push(file.destination + file.filename);
  }
  const diff = await req.body.difficulty;
  const questions = await JSON.parse(req.body.questions);
  const choices = await JSON.parse(req.body.choices);
  // const { mcq: ress, total: total } = await fl(
  //   filePaths,
  //   diff,
  //   questions,
  //   choices
  // );
  const {
    mcq: ress,
    total: total,
    categories: categories,
  } = await fl(filePaths, diff, questions, choices);
  console.log("ress");
  console.log(ress);
  res.json({ ress: ress, total: total, categories: categories });
});
