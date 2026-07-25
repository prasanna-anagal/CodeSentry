import crypto from "node:crypto";

// A stable identity for a finding that survives across scans even if unrelated
// lines in the file shift around - based on what was found and where, not on
// line number alone.
export const fingerprintFinding = ({ type, file, match }) => {
  return crypto.createHash("sha256").update(`${type}|${file}|${match}`).digest("hex");
};
