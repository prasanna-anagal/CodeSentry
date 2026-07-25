import { Router } from "express";
import { Finding } from "../models/finding.model.js";

const router = Router();

router.get("/", async (req, res) => {
  const findings = await Finding.find({ status: { $ne: "resolved" } })
    .sort({ createdAt: -1 })
    .limit(200);

  res.json(findings);
});

export default router;
