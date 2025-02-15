import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import numeral from "numeral";
import ora from "ora";
import { getGitBranch, readGitIgnore } from "./git.js";

function colorizeCapitals(str) {
  return str
    .split("")
    .map((char) => (char === char.toUpperCase() && /[A-Z]/.test(char) ? chalk.red(char) : char))
    .join("");
}

async function summarizeDirectory(dir, gitIgnore, summary) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    const relativePath = path.relative(process.cwd(), entryPath);
    if (gitIgnore.has(relativePath)) continue;
    if (entry.isDirectory()) {
      summary.folders++;
      await summarizeDirectory(entryPath, gitIgnore, summary);
    } else {
      const stats = await fs.stat(entryPath);
      summary.files++;
      summary.totalBytes += stats.size;
    }
  }
}

export async function recursiveIndex() {
  const summary = { files: 0, folders: 0, totalBytes: 0 };
  const gitIgnore = await readGitIgnore();
  await summarizeDirectory(process.cwd(), gitIgnore, summary);
  const gitBranch = await getGitBranch();
  let envReport = "";
  try {
    const envContent = await fs.readFile(path.resolve(".env"), "utf8");
    envReport = envContent.includes("OPENAI_API_KEY")
      ? chalk.red("OPENAI_API_KEY exists")
      : chalk.gray("OPENAI_API_KEY missing");
  } catch {
    envReport = ".env file missing";
  }
  let summaryString = chalk.black.bgRed("Model: GPT-4o") + "\n";
  summaryString += chalk.black.bgWhite(
    `Indexed ${numeral(summary.files).format("0,0")} files across ${numeral(summary.folders).format("0,0")} folders over ${numeral(summary.totalBytes).format("0.0b")}\n`
  );
  summaryString += gitBranch
    ? `Git repo: Yes, branch "${gitBranch}"\n`
    : "Git repo: No\n";
  summaryString += `Environment: ${envReport}\n`;
  return summaryString;
}

export async function displayHeader() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  let packageData;
  try {
    const data = await fs.readFile(packageJsonPath, "utf8");
    packageData = JSON.parse(data);
  } catch (error) {
    console.error("Error reading package.json:", error);
    packageData = { name: "vox", version: "1.0.0" };
  }

  const asciiArt = chalk.red(`
██╗   ██╗ ██████╗ ██╗  ██╗
██║   ██║██╔═══██╗╚██╗██╔╝
██║   ██║██║   ██║ ╚███╔╝ 
╚██╗ ██╔╝██║   ██║ ██╔██╗ 
 ╚████╔╝ ╚██████╔╝██╔╝ ██╗
  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝
  `);

  const terminalWidth = process.stdout.columns || 50;
  const redLine = chalk.red("═".repeat(terminalWidth));

  const version = chalk.bgRed.white(`Version: ${packageData.version}`);
  const info = colorizeCapitals("Voice-Operated eXecution");
  const commandsInstruction = `Use ${chalk.red("/help")} for help.`;

  console.log(redLine);
  console.log(asciiArt);
  console.log(`${info}\n`);

  const spinner = ora();
  spinner.start();
  const summary = await recursiveIndex();
  spinner.stop();
  console.log(chalk.bgWhite.black(summary));
  console.log(`${version}\n`);
  console.log(commandsInstruction);
  console.log(redLine);
}