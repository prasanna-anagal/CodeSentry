import simpleGit from "simple-git";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const cloneRepo = async (repoFullName, commit) => {
  const dir = await mkdtemp(path.join(tmpdir(), "codesentry-"));
  const url = `https://github.com/${repoFullName}.git`;

  await simpleGit().clone(url, dir);

  if (commit) {
    await simpleGit(dir).checkout(commit);
  }

  return dir;
};

export const cleanupClone = async (dir) => {
  await rm(dir, { recursive: true, force: true });
};
