import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import open from 'open';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const workspaceBasePath = path.resolve("workspace");
let currentWorkspacePath = "";

export async function createWorkspace() {
  const uid = uuidv4();
  const workspacePath = path.join(workspaceBasePath, `agent-app-${uid}`);
  try {
    await fs.mkdir(workspacePath, { recursive: true });
    console.log(chalk.red(`Workspace created at ${workspacePath}`));
  } catch (error) {
    console.error(chalk.bgRed(`Error creating workspace: ${error.message}`));
    throw error;
  }
  currentWorkspacePath = workspacePath;
  return workspacePath;
}

export async function createWorkspaceHelper() {
  return await createWorkspace();
}

export function getWorkspacePath() {
  if (!currentWorkspacePath) {
    throw new Error("Workspace has not been initialized.");
  }
  return currentWorkspacePath;
}

export async function npmInit() {
  try {
    const { stdout, stderr } = await execAsync("npm init -y", { cwd: getWorkspacePath() });
    if (stderr) {
      return `npm init encountered warnings/errors:\n${stderr}`;
    }
    return `npm init completed successfully:\n${stdout}`;
  } catch (error) {
    return `Error running npm init: ${error.message}`;
  }
}

export async function listWorkingDirectory() {
  try {
    const files = await fs.readdir(getWorkspacePath());
    return files;
  } catch (error) {
    return `Error listing directory: ${error.message}`;
  }
}

export async function npmInstallDependencies() {
  try {
    const { stdout, stderr } = await execAsync("npm install", { cwd: getWorkspacePath() });
    if (stderr) {
      return `npm install encountered warnings/errors:\n${stderr}`;
    }
    return `npm install completed successfully:\n${stdout}`;
  } catch (error) {
    return `Error running npm install: ${error.message}`;
  }
}

export async function serveWorkspace() {
  const app = express();
  const port = 3000;
  app.use(express.static(getWorkspacePath()));
  const server = app.listen(port, () => {
    console.log(chalk.white.bgGreen(`Workspace is being served at http://localhost:${port}`));
  });
  return `http://localhost:${port}`;
}

export async function openBrowser(url) {
  try {
    await open(url);
    console.log(chalk.yellow(`Browser opened at ${url}`));
  } catch (error) {
    console.error(chalk.bgRed(`Error opening browser: ${error.message}`));
  }
}