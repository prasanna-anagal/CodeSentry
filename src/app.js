import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { connectDB } from "./config/db.js";
import githubRoutes from "./routes/github.routes.js";
import { initSocket } from "./socket.js";
import { relayScanEvents } from "./relayScanEvents.js";

const app = express();
const server = createServer(app);
initSocket(server);
const PORT = process.env.PORT || 9000;

app.use(cors());
app.use(
  express.json({
    // Keep the raw request body around so the GitHub webhook signature
    // (computed over the exact bytes GitHub sent) can be verified.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "CodeSentry" });
});

app.use("/api/github", githubRoutes);

const start = async () => {
  await connectDB();
  await relayScanEvents();
  server.listen(PORT, () => {
    console.log(`CodeSentry server listening on port ${PORT}`);
  });
};

start();
