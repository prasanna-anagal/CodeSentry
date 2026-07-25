import mongoose, { Schema } from "mongoose";

const findingSchema = new Schema({
  scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true },
  repo: { type: String, required: true },
  commit: { type: String, required: true },
  type: { type: String, enum: ["secret", "vulnerability", "pii"], required: true },
  file: { type: String, required: true },
  line: { type: Number },
  detail: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Finding = mongoose.model("Finding", findingSchema);
