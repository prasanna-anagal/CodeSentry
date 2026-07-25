import { parseDependencies } from "./parseDependencies.js";
import { searchCvesByKeyword } from "./nvdClient.js";
import { VulnCache } from "../models/vulnCache.model.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const getCvesForPackage = async (packageName) => {
  const cached = await VulnCache.findOne({ packageName });
  const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;

  if (isFresh) {
    return cached.cves;
  }

  const cves = await searchCvesByKeyword(packageName);

  await VulnCache.findOneAndUpdate(
    { packageName },
    { packageName, cves, fetchedAt: new Date() },
    { upsert: true }
  );

  return cves;
};

export const checkVulnerabilities = async (repoDir) => {
  const dependencies = await parseDependencies(repoDir);
  const findings = [];

  for (const dep of dependencies) {
    const cves = await getCvesForPackage(dep.name);

    cves.forEach((cve) => {
      findings.push({
        file: "package.json",
        match: `${dep.name}@${dep.version}:${cve.id}`,
        detail: `${dep.name}@${dep.version}: ${cve.id} (${cve.severity}, score ${cve.score ?? "n/a"}) - ${cve.description.slice(0, 150)}...`,
      });
    });
  }

  return findings;
};
