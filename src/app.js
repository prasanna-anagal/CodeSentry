import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { connectDB } from "./config/db.js";
import githubRoutes from "./routes/github.routes.js";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 9000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "CodeSentry" });
});

app.use("/api/github", githubRoutes);

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`CodeSentry server listening on port ${PORT}`);
  });
};

start();
