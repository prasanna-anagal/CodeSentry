import { readFile } from "node:fs/promises";
import path from "node:path";
import { walkFiles } from "./walkFiles.js";
import { shannonEntropy } from "./entropy.js";

const ENTROPY_THRESHOLD = 4.0;
const MIN_TOKEN_LENGTH = 20;
const TOKEN_PATTERN = /[A-Za-z0-9+/_=-]{20,}/g;

export const scanForSecrets = async (repoDir) => {
  const files = await walkFiles(repoDir);
  const findings = [];

  for (const filePath of files) {
    let content;
    try {
      content = await readFile(filePath, "utf8");
    } catch {
      continue; // binary or unreadable file, skip
    }

    content.split("\n").forEach((line, index) => {
      const candidates = line.match(TOKEN_PATTERN) || [];

      candidates.forEach((token) => {
        if (token.length < MIN_TOKEN_LENGTH) return;

        const entropy = shannonEntropy(token);
        if (entropy >= ENTROPY_THRESHOLD) {
          findings.push({
            file: path.relative(repoDir, filePath),
            line: index + 1,
            match: token,
            detail: `High-entropy string detected (entropy=${entropy.toFixed(2)}): ${token.slice(0, 12)}...`,
          });
        }
      });
    });
  }

  return findings;
};
