import mongoose, { Schema } from "mongoose";

const findingSchema = new Schema({
  scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true },
  repo: { type: String, required: true },
  commit: { type: String, required: true },
  type: { type: String, enum: ["secret", "vulnerability", "pii"], required: true },
  file: { type: String, required: true },
  line: { type: Number },
  match: { type: String },
  detail: { type: String },
  fingerprint: { type: String, required: true, index: true },
  status: { type: String, enum: ["new", "persisting", "resolved"], default: "new" },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

findingSchema.index({ repo: 1, fingerprint: 1 });

export const Finding = mongoose.model("Finding", findingSchema);
