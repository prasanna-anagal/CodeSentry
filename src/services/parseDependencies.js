import { readFile } from "node:fs/promises";
import path from "node:path";

export const parseDependencies = async (repoDir) => {
  let pkgRaw;
  try {
    pkgRaw = await readFile(path.join(repoDir, "package.json"), "utf8");
  } catch {
    return []; // no package.json, nothing to check
  }

  const pkg = JSON.parse(pkgRaw);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  return Object.entries(deps).map(([name, version]) => ({
    name,
    version: version.replace(/^[\^~>=<]+/, ""),
  }));
};
