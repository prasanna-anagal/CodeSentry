import { Scan } from "../models/scan.model.js";
import { Finding } from "../models/finding.model.js";
import { fingerprintFinding } from "./fingerprintFinding.js";

// Compares this scan's raw findings against the repo's previous completed scan,
// tagging each one "new" or "persisting", and marks findings that existed last
// time but are gone now as "resolved".
export const diffFindings = async (repo, currentScanId, rawFindings) => {
  const previousScan = await Scan.findOne({
    repo,
    status: "completed",
    _id: { $ne: currentScanId },
  }).sort({ startedAt: -1 });

  const previousFingerprints = previousScan
    ? new Set(
        (await Finding.find({ scanId: previousScan._id }).select("fingerprint")).map(
          (f) => f.fingerprint
        )
      )
    : new Set();

  const currentFingerprints = new Set();

  const classified = rawFindings.map((finding) => {
    const fingerprint = fingerprintFinding(finding);
    currentFingerprints.add(fingerprint);

    return {
      ...finding,
      fingerprint,
      status: previousFingerprints.has(fingerprint) ? "persisting" : "new",
    };
  });

  const resolvedFingerprints = [...previousFingerprints].filter(
    (fp) => !currentFingerprints.has(fp)
  );

  if (resolvedFingerprints.length > 0) {
    await Finding.updateMany(
      { repo, fingerprint: { $in: resolvedFingerprints }, status: { $ne: "resolved" } },
      { status: "resolved", resolvedAt: new Date() }
    );
  }

  return classified;
};
