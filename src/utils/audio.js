import Mic from "node-mic";
import fs from "fs";
import path from "path";
import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import { createWorkspaceHelper } from "../workspace.js";
import { agent } from "../ai/agent.js";
import { serveWorkspace, openBrowser } from "../workspace.js";

function getAmplitude(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const int = buffer.readInt16LE(i);
    sum += Math.abs(int);
  }
  const rms = Math.sqrt(sum / (buffer.length / 2));
  return rms;
}

function amplitudeToDecibels(amplitude) {
  const db = 20 * Math.log10(amplitude / 32768);
  return isFinite(db) ? db : 0;
}

function renderRecordingStatus(seconds, decibels) {
  const barLength = 20;
  const minDb = -70;
  const maxDb = -50;
  const normalizedDb = Math.max(Math.min(decibels, maxDb), minDb);
  const dbPercentage = ((normalizedDb - minDb) / (maxDb - minDb)) * 100;
  const filledLength = Math.round((dbPercentage / 100) * barLength);
  const filledBar = chalk.red("█".repeat(filledLength));
  const emptyBar = "█".repeat(barLength - filledLength);
  const bar = filledBar + emptyBar;
  process.stdout.write("\x1b[0G");
  process.stdout.write(
    `Recording, press ENTER when done... ${seconds}sec ${bar} ${decibels.toFixed(2)} dB`
  );
}

export async function handleVoiceInput(rl) {
  console.log(chalk.red("Initializing sound device..."));

  const micInstance = new Mic({
    rate: "16000",
    channels: "1",
    debug: false,
    exitOnSilence: 6,
    fileType: "wav"
  });

  const micInputStream = micInstance.getAudioStream();
  const outputFile = path.join(process.cwd(), "voice_input.wav");
  const outputFileStream = fs.createWriteStream(outputFile);

  micInputStream.pipe(outputFileStream);

  let startTime = Date.now();
  let recording = true;

  process.stdout.write("\x1B[?25l");
  micInstance.start();

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  const onKeyPress = (str, key) => {
    if (key.name === "return") {
      stopRecording();
    }
  };

  process.stdin.on("keypress", onKeyPress);

  async function stopRecording() {
    if (!recording) return;
    recording = false;
    micInstance.stop();
    process.stdin.removeListener("keypress", onKeyPress);
    process.stdout.write("\x1B[?25h");
    console.log(`\n${chalk.red("Recording stopped. Audio saved to voice_input.wav")}`);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    const fileStream = fs.createReadStream(outputFile);
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log(chalk.red("Connecting to OpenAI for transcription..."));
    const spinner = ora().start();
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      response_format: "text"
    });
    spinner.stop();
    console.log(chalk.bgWhite.black(transcription));

    await createWorkspaceHelper();
    const agentSpinner = ora().start();
    const response = await agent(transcription);
    agentSpinner.stop();
    console.log(chalk.bgWhite.black(response));

    const url = await serveWorkspace();
    await openBrowser(url);
    rl.prompt();
  }

  micInputStream.on("error", (err) => {
    console.error("Error in audio stream:", err);
    stopRecording();
  });

  micInputStream.on("data", (data) => {
    if (!recording) return;
    const amplitude = getAmplitude(data);
    const decibels = amplitudeToDecibels(amplitude);
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    renderRecordingStatus(elapsedSeconds, decibels);
  });

  micInputStream.on("end", () => {
    stopRecording();
  });
}