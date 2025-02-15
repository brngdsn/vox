import fs from 'fs/promises';
import path from 'path';
import { getWorkspacePath } from './workspace.js';

export async function createFile(filePath, content) {
  const fullPath = path.join(getWorkspacePath(), filePath);
  await fs.writeFile(fullPath, content, "utf8");
  return `File created at ${fullPath}`;
}

export async function readFile(filePath) {
  const fullPath = path.join(getWorkspacePath(), filePath);
  const data = await fs.readFile(fullPath, "utf8");
  return data;
}

export async function updateFile(filePath, content) {
  const fullPath = path.join(getWorkspacePath(), filePath);
  await fs.writeFile(fullPath, content, "utf8");
  return `File updated at ${fullPath}`;
}

export async function deleteFile(filePath) {
  const fullPath = path.join(getWorkspacePath(), filePath);
  await fs.unlink(fullPath);
  return `File deleted at ${fullPath}`;
}

export async function createFolder(folderPath) {
  const fullPath = path.join(getWorkspacePath(), folderPath);
  await fs.mkdir(fullPath, { recursive: true });
  return `Folder created at ${fullPath}`;
}

export async function deleteFolder(folderPath) {
  const fullPath = path.join(getWorkspacePath(), folderPath);
  await fs.rm(fullPath, { recursive: true, force: true });
  return `Folder deleted at ${fullPath}`;
}