#!/usr/bin/env node

import dotenv from 'dotenv'; dotenv.config();
import * as fs_sync from 'fs';
import fs from 'fs/promises';
import { spawn, exec } from 'child_process';
import Mic from 'node-mic';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import ora from 'ora'; // Importing ora for the spinner
import numeral from 'numeral';
import OpenAI from "openai";
import { agent, serveWorkspace,
  createWorkspaceHelper, openBrowser } from './ai-agent-0922.js';

// Utility to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const red = '\x1b[31m';   // ANSI escape code for red
const grey = '\x1b[90m';  // ANSI escape code for grey
const reset = '\x1b[0m';  // Reset color
const black = '\x1b[30m';
const whiteBg = '\x1b[47m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const white = '\x1b[37m';
const greenBg = '\x1b[42m';
const cyan = '\x1b[36m';


const spinner = ora('');

const execAsync = promisify(exec);

async function getGitBranch() {
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
    return stdout.trim();
  } catch {
    return null; // Not a git repository
  }
}

async function readGitIgnore() {
  try {
    const gitignorePath = path.resolve(__dirname, '../.gitignore');
    const data = await fs.readFile(gitignorePath, 'utf8');
    return new Set(data.split('\n').join(``).split(`\r`).filter(Boolean));
  } catch {
    return new Set(); // No .gitignore found
  }
}

async function checkEnvVariable() {
  try {
    const envPath = path.resolve('.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    const envVariables = envContent.split('\n');
    const voxApiKey = envVariables.find(line => line.startsWith('OPENAI_API_KEY'));
    return voxApiKey ? `${red}OPENAI_API_KEY exists` : `${grey}OPENAI_API_KEY missing`;
  } catch {
    return '.env file missing';
  }
}

async function summarizeDirectory(dir, gitIgnore, summary) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    const relativePath = path.relative(process.cwd(), entryPath);

    if (gitIgnore.has(relativePath)) continue; // Skip ignored files

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

async function recursiveIndex() {
  const summary = { files: 0, folders: 0, totalBytes: 0 };

  // Check for .gitignore and apply it
  const gitIgnore = await readGitIgnore();

  // Recursively index the current directory
  await summarizeDirectory(process.cwd(), gitIgnore, summary);

  // Get git branch if it's a git repository
  const gitBranch = await getGitBranch();

  // Check for VOX_API_KEY in .env
  const envReport = await checkEnvVariable();

  // Create summary string
  let summaryString = `${black}Model: ${red}GPT-4o${reset}\n`;
  summaryString += `${whiteBg}${black}Indexed ${numeral(summary.files).format(`0,0`)} files across ${numeral(summary.folders).format(`0,0`)} folders over ${numeral(summary.totalBytes).format(`0.0b`)}\n`;

  if (gitBranch) {
    summaryString += `Git repo: Yes, branch "${gitBranch}"\n`;
  } else {
    summaryString += `Git repo: No\n`;
  }

  summaryString += `Environment: ${envReport}\n`;

  return summaryString;
}

// Function to colorize capitol letters
function colorizeCapitals(str) {
  
    return str.split('').map(char => {
      if (char === char.toUpperCase() && /[A-Z]/.test(char)) {
        return `${red}${char}${grey}`;
      }
      return char;
    }).join('') + reset;
}

// Function to display the startup header
async function displayHeader() {
  // Read package.json to get name and version
  const packageJsonPath = path.join(__dirname, '../package.json');
  let packageData;
  try {
    const data = fs_sync.readFileSync(packageJsonPath, 'utf8');
    packageData = JSON.parse(data);
  } catch (error) {
    console.error('Error reading package.json:', error);
    packageData = { name: 'braun', version: '1.0.0' };
  }

  // ASCII Art for 'vox' in red
  const asciiArt = `\x1b[31m
██╗   ██╗ ██████╗ ██╗  ██╗
██║   ██║██╔═══██╗╚██╗██╔╝
██║   ██║██║   ██║ ╚███╔╝ 
╚██╗ ██╔╝██║   ██║ ██╔██╗ 
 ╚████╔╝ ╚██████╔╝██╔╝ ██╗
  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝
\x1b[0m`;

  // Function to generate a solid red line spanning the terminal width
  const getRedLine = () => {
    const width = process.stdout.columns || 50; // Fallback to 50 if undefined
    return `${red}${'═'.repeat(width)}${reset}`;
  };

  // Version with background red and white text
  const version = `${'\x1b[41m\x1b[37m'}Version: ${packageData.version}${reset}`;
  const info = colorizeCapitals(`Voice-Operated eXecution`);

  // Available Commands Instruction
  const commandsInstruction = `Use ${red}/help${reset} for help.`;

  // Combine all parts of the header
  console.log(getRedLine());
  console.log(asciiArt);
  console.log(`${info}\n`);
  // Usage
  spinner.start();
  const sumary = await recursiveIndex();
  spinner.stop();
  console.log(`${whiteBg}${black}${sumary}${reset}\n`);
  console.log(`${version}\n`);
  // Real-time Audio-to-code Machine
  console.log(commandsInstruction);
  console.log(getRedLine());

}

// Function to handle Text Input Command
async function handleTextInput(rl) {
  rl.question('Enter your text: ', (userText) => {
    fs.writeFile('text_input.txt', userText, (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log(`${red}Text saved to text_input.txt${reset}`);
      }
      rl.prompt();
    });
  });
}

// Function to handle Voice Input Command
async function handleVoiceInput(rl) {
  console.log(`${red}Initializing sound device...${reset}`);

  // Initialize mic instance
  const micInstance = new Mic({
    rate: '16000',
    channels: '1',
    debug: false,
    exitOnSilence: 6,
    fileType: 'wav', // Ensure WAV format
  });

  const micInputStream = micInstance.getAudioStream();
  const outputFileStream = fs_sync.createWriteStream(path.join(process.cwd(), 'voice_input.wav'));

  micInputStream.pipe(outputFileStream);

  let startTime = Date.now();
  let recording = true;

  // Hide cursor for better UI experience
  process.stdout.write('\x1B[?25l');

  // Start recording
  micInstance.start();

  // Setup keypress listener to stop recording on Enter
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  const onKeyPress = (str, key) => {
    if (key.name === 'return') { // Enter key
      stopRecording();
    }
  };

  process.stdin.on('keypress', onKeyPress);

  // Function to stop recording
  const stopRecording = async () => {
    if (recording) {
      recording = false;
      micInstance.stop();
      process.stdin.removeListener('keypress', onKeyPress);
      // Show cursor again
      process.stdout.write('\x1B[?25h');
      console.log(`\n${red}Recording stopped. Audio saved to voice_input.wav${reset}`);
      // Restore normal mode
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      const fileStream = fs_sync.createReadStream(path.join(process.cwd(), 'voice_input.wav'));
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log(`${red}Connecting to OpenAI...${reset}`);
      spinner.start();
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        response_format: "text",
      });
      spinner.stop();
      console.log(`\n${whiteBg}${black}${transcription}${reset}`);
      const workspacePath = await createWorkspaceHelper();
      spinner.start();
      const response = await agent(transcription);
      spinner.stop();
      console.log(`${whiteBg}${response}${reset}\n`);
      spinner.start();
      // Serve the workspace and open the browser
      const url = await serveWorkspace(workspacePath);
      spinner.stop();
      spinner.start();
      await openBrowser(url);
      spinner.stop();
      rl.prompt();
    }
  };

  // Handle errors from micInputStream
  micInputStream.on('error', (err) => {
    console.error('Error in Input Stream:', err);
    stopRecording();
  });

  // Process audio data for real-time decibel measurement
  micInputStream.on('data', (data) => {
    if (!recording) return;
    const amplitude = getAmplitude(data);
    const decibels = amplitudeToDecibels(amplitude);
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    renderRecordingStatus(elapsedSeconds, decibels);
  });

  // Handle end of stream
  micInputStream.on('end', () => {
    stopRecording();
  });
}

// Function to calculate amplitude from audio buffer
function getAmplitude(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const int = buffer.readInt16LE(i);
    sum += Math.abs(int);
  }
  const rms = Math.sqrt(sum / (buffer.length / 2));
  return rms;
}

// Function to convert amplitude to decibels
function amplitudeToDecibels(amplitude) {
  const db = 20 * Math.log10(amplitude / 32768);
  return isFinite(db) ? db : 0;
}

// Function to render recording status
function renderRecordingStatus(seconds, decibels) {
    const barLength = 20; // Adjusted for better fit in UX
    const minDb = -70;
    const maxDb = -50;
    
    // Normalize the decibel value within the range [-75, -35]
    const normalizedDb = Math.max(Math.min(decibels, maxDb), minDb); // Clamp to the range [-75, -35]
    const dbPercentage = ((normalizedDb - minDb) / (maxDb - minDb)) * 100; // Convert to percentage between 0 and 100
    
    // Calculate the length of the filled portion of the bar
    const filledLength = Math.round((dbPercentage / 100) * barLength);
    
    // Generate the filled and empty parts of the bar
    const filledBar = red + '█'.repeat(filledLength) + reset;
    const emptyBar = '█'.repeat(barLength - filledLength);
    
    // Combine the filled and empty parts into the full bar
    const bar = filledBar + emptyBar;
    

  // Move cursor to the beginning of the line
  process.stdout.write('\x1b[0G');

  // Write the recording status
  process.stdout.write(`Recording, press ENTER when done... ${seconds}sec ${bar} ${decibels.toFixed(2)} dB`);
}

// Function to handle /help command
async function handleHelp(rl) {
  console.log(`${red}
${grey}Available Commands:${reset}

  ${red}/voice${grey}  - Record audio input and save to voice_input.wav${reset}
  ${red}/help${grey}  - Display this help message${reset}
  ${red}/exit${grey}   - Exit the application${reset}
  ${reset}`);
  rl.prompt();
}

// Main function
async function main() {
  await displayHeader();

  // Create readline interface with bold green prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[1m\x1b[32m> \x1b[0m' // Bold and green '> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (input.startsWith('/')) {
      const command = input.toLowerCase();

      switch (command) {
        case '/text':
          await handleTextInput(rl);
          break;
        case '/voice':
          await handleVoiceInput(rl);
          break;
        case '/help':
          await handleHelp(rl);
          break;
        case '/exit':
          console.log(`${grey}Ok!${reset}`);
          rl.close();
          process.exit(0);
          break;
        default:
          console.log(`Unknown command. Use /help for the list of available commands.`);
          rl.prompt();
      }
    } else {
      // console.log('Invalid input. Please enter a command prefixed with "/". Use /help for help.');
      rl.prompt();
    }
  });

  rl.on('close', () => {
    console.log(`${red}Goodbye!${reset}`);
    process.exit(0);
  });
}

// Run the main function
main();
