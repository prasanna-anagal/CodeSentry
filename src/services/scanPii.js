import { readFile } from "node:fs/promises";
import path from "node:path";
import { walkFiles } from "./walkFiles.js";

const PII_PATTERNS = [
  { label: "email address", pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { label: "phone number", pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { label: "credit card number", pattern: /\b(?:\d[ -]?){13,16}\b/g },
];

export const scanForPii = async (repoDir) => {
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
      PII_PATTERNS.forEach(({ label, pattern }) => {
        const matches = line.match(pattern) || [];

        matches.forEach((match) => {
          findings.push({
            file: path.relative(repoDir, filePath),
            line: index + 1,
            match,
            detail: `Possible ${label} found: ${match}`,
          });
        });
      });
    });
  }

  return findings;
};
