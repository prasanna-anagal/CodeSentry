import mongoose, { Schema } from "mongoose";

const vulnCacheSchema = new Schema({
  packageName: { type: String, required: true, unique: true },
  cves: [
    {
      id: String,
      description: String,
      severity: String,
      score: Number,
    },
  ],
  fetchedAt: { type: Date, default: Date.now },
});

export const VulnCache = mongoose.model("VulnCache", vulnCacheSchema);
