import { readdir } from "node:fs/promises";
import path from "node:path";

const IGNORED_DIRS = new Set([".git", "node_modules"]);

export const walkFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(await walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
};
