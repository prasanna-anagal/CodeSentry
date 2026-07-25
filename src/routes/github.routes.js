import { Router } from "express";
import { getScanQueue } from "../queues/scanQueue.js";

const router = Router();

router.post("/webhook", async (req, res) => {
  const event = req.get("X-GitHub-Event");

  if (event === "ping") {
    return res.status(200).json({ message: "pong" });
  }

  if (event !== "push") {
    return res.status(200).json({ message: `Ignored event: ${event}` });
  }

  const { repository, after, pusher } = req.body;
  const job = await getScanQueue().add("scan-repo", {
    repo: repository?.full_name,
    commit: after,
    pusher: pusher?.name,
    enqueuedAt: new Date().toISOString(),
  });

  console.log(`[webhook] push received for ${repository?.full_name} @ ${after} -> job ${job.id}`);
  res.status(202).json({ message: "Scan enqueued", jobId: job.id });
});

export default router;
