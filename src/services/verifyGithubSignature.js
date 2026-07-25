import crypto from "node:crypto";

export const verifyGithubSignature = (payloadBuffer, signatureHeader, secret) => {
  if (!signatureHeader || !payloadBuffer || !secret) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payloadBuffer).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};
