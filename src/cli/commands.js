import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { handleVoiceInput as voiceInputHandler } from "../utils/audio.js";

export async function handleTextInput(rl) {
  rl.question("Enter your text: ", async (userText) => {
    try {
      await fs.writeFile(path.join(process.cwd(), "text_input.txt"), userText, "utf8");
      console.log(chalk.red("Text saved to text_input.txt"));
    } catch (error) {
      console.error(chalk.bgRed("Error writing to file:"), error);
    }
    rl.prompt();
  });
}

export async function handleHelp(rl) {
  console.log(
    chalk.red(`
Available Commands:

  ${chalk.red("/voice")}  - Record audio input and save to voice_input.wav
  ${chalk.red("/text")}   - Enter text input and save to text_input.txt
  ${chalk.red("/help")}   - Display this help message
  ${chalk.red("/exit")}   - Exit the application
`)
  );
  rl.prompt();
}

export async function handleVoiceInput(rl) {
  await voiceInputHandler(rl);
}