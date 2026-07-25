import mongoose, { Schema } from "mongoose";

const scanSchema = new Schema({
  repo: { type: String, required: true },
  commit: { type: String, required: true },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  status: { type: String, enum: ["running", "completed", "failed"], default: "running" },
});

export const Scan = mongoose.model("Scan", scanSchema);
