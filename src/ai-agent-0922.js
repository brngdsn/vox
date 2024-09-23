import dotenv from 'dotenv'; dotenv.config()
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import open from "open";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

const red = '\x1b[31m';   // ANSI escape code for red
const redBg = '\x1b[41m';   // ANSI escape code for redBg
const grey = '\x1b[90m';  // ANSI escape code for grey
const reset = '\x1b[0m';  // Reset color
const black = '\x1b[30m';
const whiteBg = '\x1b[47m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const white = '\x1b[37m';
const greenBg = '\x1b[37m';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const workspaceBasePath = path.resolve("./workspace");

// Function to create a unique workspace
async function createWorkspace() {
  const uid = uuidv4();
  const workspacePath = path.join(workspaceBasePath, `agent-app-${uid}`);

  try {
    await fs.mkdir(workspacePath, { recursive: true });
    console.log(`${red}Workspace created at ${workspacePath}${reset}`);
  } catch (error) {
    console.error(`${redBg}Error creating workspace: ${error}${reset}`);
    throw error;
  }

  return workspacePath;
}

// Initialize workspace
let workspacePath;
export async function createWorkspaceHelper() {
  workspacePath = await createWorkspace();
  return workspacePath;
}

// Function to run 'npm init -y' in the workspace directory
async function npmInit() {
  try {
    const { stdout, stderr } = await execAsync("npm init -y", { cwd: workspacePath });
    if (stderr) {
      return `npm init encountered warnings/errors:\n${stderr}`;
    }
    return `npm init completed successfully:\n${stdout}`;
  } catch (error) {
    return `Error running npm init: ${error.message}`;
  }
}

// Function to list the contents of the workspace directory
async function listWorkingDirectory() {
  try {
    const files = await fs.readdir(workspacePath);
    return files;
  } catch (error) {
    return `Error listing directory: ${error.message}`;
  }
}

// Function to run 'npm install' in the workspace directory
async function npmInstallDependencies() {
  try {
    const { stdout, stderr } = await execAsync("npm install", { cwd: workspacePath });
    if (stderr) {
      return `npm install encountered warnings/errors:\n${stderr}`;
    }
    return `npm install completed successfully:\n${stdout}`;
  } catch (error) {
    return `Error running npm install: ${error.message}`;
  }
}

// Function to serve the workspace over HTTP
export async function serveWorkspace(workspacePath) {
  const app = express();
  const port = 3000; // You can choose any available port

  app.use(express.static(workspacePath));

  const server = app.listen(port, () => {
    console.log(`${white}${greenBg}Workspace is being served at http://localhost:${port}${reset}`);
  });

  return `http://localhost:${port}`;
}

// Function to open the web browser
export async function openBrowser(url) {
  try {
    await open(url);
    console.log(`${yellow}Browser opened at ${red}${url}${reset}`);
  } catch (error) {
    console.error(`${redBg}Error opening browser: ${error}${reset}`);
  }
}

// Filesystem CRUD Functions
async function createFile(filePath, content) {
  const fullPath = path.join(workspacePath, filePath);
  await fs.writeFile(fullPath, content, "utf8");
  return `File created at ${fullPath}`;
}

async function readFile(filePath) {
  const fullPath = path.join(workspacePath, filePath);
  const data = await fs.readFile(fullPath, "utf8");
  return data;
}

async function updateFile(filePath, content) {
  const fullPath = path.join(workspacePath, filePath);
  await fs.writeFile(fullPath, content, "utf8");
  return `File updated at ${fullPath}`;
}

async function deleteFile(filePath) {
  const fullPath = path.join(workspacePath, filePath);
  await fs.unlink(fullPath);
  return `File deleted at ${fullPath}`;
}

async function createFolder(folderPath) {
  const fullPath = path.join(workspacePath, folderPath);
  await fs.mkdir(fullPath, { recursive: true });
  return `Folder created at ${fullPath}`;
}

async function deleteFolder(folderPath) {
  const fullPath = path.join(workspacePath, folderPath);
  await fs.rmdir(fullPath, { recursive: true });
  return `Folder deleted at ${fullPath}`;
}

async function getLocation() {
  const response = await fetch("https://ipapi.co/json/");
  const locationData = await response.json();
  return locationData;
}
 
async function getCurrentWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=apparent_temperature`;
  const response = await fetch(url);
  const weatherData = await response.json();
  return weatherData;
}

// New Tools for Filesystem Operations
const tools = [
  {
    type: "function",
    function: {
      name: "npmInit",
      description: "Initialize a new npm project in the workspace root directory using 'npm init -y'",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listWorkingDirectory",
      description: "List the contents of the workspace root directory",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "npmInstallDependencies",
      description: "Run 'npm install' in the workspace root to install dependencies",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCurrentWeather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          latitude: {
            type: "string",
          },
          longitude: {
            type: "string",
          },
        },
        required: ["longitude", "latitude"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLocation",
      description: "Get the user's location based on their IP address",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  // Filesystem CRUD Tools
  {
    type: "function",
    function: {
      name: "createFile",
      description: "Create a new file with specified content",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          content: { type: "string" },
        },
        required: ["filePath", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read the content of a specified file",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" },
        },
        required: ["filePath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateFile",
      description: "Update the content of a specified file",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          content: { type: "string" },
        },
        required: ["filePath", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteFile",
      description: "Delete a specified file",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" },
        },
        required: ["filePath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createFolder",
      description: "Create a new folder",
      parameters: {
        type: "object",
        properties: {
          folderPath: { type: "string" },
        },
        required: ["folderPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteFolder",
      description: "Delete a specified folder",
      parameters: {
        type: "object",
        properties: {
          folderPath: { type: "string" },
        },
        required: ["folderPath"],
      },
    },
  },
];

const availableTools = {
  npmInit, // Newly added
  listWorkingDirectory,        // Newly added
  npmInstallDependencies,      // Newly added
  getCurrentWeather,
  getLocation,
  createFile,
  readFile,
  updateFile,
  deleteFile,
  createFolder,
  deleteFolder,
};

const messages = [
  {
    role: "system",
    content: `You are a helpful assistant. Only use the functions you have been provided with.`,
  },
];

export async function agent(userInput) {
  messages.push({
    role: "user",
    content: `${userInput}`,
  });

  for (let i = 0; i < 20; i++) { // Increased iterations to accommodate more complex tasks
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      tools: tools,
    });

    const { finish_reason, message } = response.choices[0];
    // console.log(`${grey}${JSON.stringify(message, null, 2)}${reset}`)

    if (finish_reason === "tool_calls" && message.tool_calls) {
      const functionCall = message.tool_calls[0];
      const functionName = functionCall.function.name;
      const functionToCall = availableTools[functionName];
      const functionArgs = JSON.parse(functionCall.function.arguments);
      const functionArgsArr = Object.values(functionArgs);
      let functionResponse;
      console.log({ functionCall, functionName, functionToCall, });

      try {
        functionResponse = await functionToCall.apply(null, functionArgsArr);
      } catch (error) {
        functionResponse = `Error executing ${functionName}: ${error.message}`;
      }

      messages.push({
        role: "function",
        name: functionName,
        content: functionResponse,
      });
    } else if (finish_reason === "stop") {
      messages.push(message);
      return message.content;
    }
  }
  return "The maximum number of iterations has been met without a suitable answer. Please try again with a more specific input.";
}

/*

// Example usage
const userPrompt = "Please create a simple HTML file for a personal website and open it in the browser.\n\nYou are a helpful assistant. Only use the functions you have been provided with.";

(async () => {
  const response = await agent(userPrompt);
  console.log("Agent response:", response);

  // Serve the workspace and open the browser
  const url = await serveWorkspace(workspacePath);
  await openBrowser(url);
})();

*/

