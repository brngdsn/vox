import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import chalk from "chalk";

const execAsync = promisify(exec);

export async function getGitBranch() {
  try {
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD");
    return stdout.trim();
  } catch {
    return null; // Not a git repository
  }
}

export async function readGitIgnore() {
  try {
    const gitignorePath = path.resolve(".gitignore");
    const data = await fs.readFile(gitignorePath, "utf8");
    return new Set(data.split(/\r?\n/).filter(line => line && !line.startsWith("#")));
  } catch {
    return new Set();
  }
}