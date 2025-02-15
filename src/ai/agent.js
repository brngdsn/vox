import 'dotenv/config';
import OpenAI from 'openai';
import chalk from 'chalk';
import { exec } from 'child_process';
import util from 'util';
import { 
  npmInit, 
  listWorkingDirectory, 
  npmInstallDependencies, 
  serveWorkspace, 
  openBrowser, 
  getWorkspacePath 
} from '../workspace.js';
import { 
  createFile, 
  readFile, 
  updateFile, 
  deleteFile, 
  createFolder, 
  deleteFolder 
} from '../filesystem.js';
import { getCurrentWeather, getLocation } from '../api/weather.js';

const execAsync = util.promisify(exec);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const tools = [
  {
    type: "function",
    function: {
      name: "npmInit",
      description: "Initialize a new npm project in the workspace root directory using 'npm init -y'",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listWorkingDirectory",
      description: "List the contents of the workspace root directory",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "npmInstallDependencies",
      description: "Run 'npm install' in the workspace root to install dependencies",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getCurrentWeather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "string" },
          longitude: { type: "string" }
        },
        required: ["latitude", "longitude"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getLocation",
      description: "Get the user's location based on their IP address",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createFile",
      description: "Create a new file with specified content",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          content: { type: "string" }
        },
        required: ["filePath", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read the content of a specified file",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" }
        },
        required: ["filePath"]
      }
    }
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
          content: { type: "string" }
        },
        required: ["filePath", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteFile",
      description: "Delete a specified file",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" }
        },
        required: ["filePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createFolder",
      description: "Create a new folder",
      parameters: {
        type: "object",
        properties: {
          folderPath: { type: "string" }
        },
        required: ["folderPath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteFolder",
      description: "Delete a specified folder",
      parameters: {
        type: "object",
        properties: {
          folderPath: { type: "string" }
        },
        required: ["folderPath"]
      }
    }
  }
];

const availableTools = {
  npmInit,
  listWorkingDirectory,
  npmInstallDependencies,
  getCurrentWeather,
  getLocation,
  createFile,
  readFile,
  updateFile,
  deleteFile,
  createFolder,
  deleteFolder
};

const messages = [
  {
    role: "user",
    content: "You are a helpful assistant. Only use the functions you have been provided with."
  }
];

export async function agent(userInput) {
  messages.push({
    role: "user",
    content: userInput
  });

  for (let i = 0; i < 20; i++) {
    const response = await openai.chat.completions.create({
      model: "o3-mini",
      messages,
      tools
    });

    const { finish_reason, message } = response.choices[0];

    messages.push(message);

    if (finish_reason === "tool_calls" && message.tool_calls) {
      const functionCall = message.tool_calls[0];
      const functionName = functionCall.function.name;
      const functionToCall = availableTools[functionName];
      const functionArgs = JSON.parse(functionCall.function.arguments || "{}");
      const functionArgsArr = Object.values(functionArgs);

      console.log(chalk.red(`Calling function: ${functionName}`));
      if (functionArgs.content) {
        console.log(chalk.bgWhite.black(`File: ${functionArgs.filePath}`));
        console.log(chalk.bgWhite.black(`Content: ${functionArgs.content}`));
      } else {
        console.log(chalk.bgWhite.black(JSON.stringify(functionArgs, null, 2)));
      }

      let functionResponse;
      try {
        functionResponse = await functionToCall(...functionArgsArr);
        console.log(chalk.bgWhite.black(functionResponse));
      } catch (error) {
        functionResponse = `Error executing ${functionName}: ${error.message}`;
      }

      messages.push({
        role: "tool",
        tool_call_id: functionCall.id,
        name: functionName,
        content: functionResponse
      });
    } else if (finish_reason === "stop") {
      return message.content;
    }
  }
  return "The maximum number of iterations has been met without a suitable answer. Please try again with a more specific input.";
}