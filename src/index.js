#!/usr/bin/env node

import 'dotenv/config';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';
import { displayHeader } from './utils/header.js';
import { handleTextInput, handleVoiceInput, handleHelp } from './cli/commands.js';

async function main() {
  await displayHeader();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.bold.green('> ')
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim().toLowerCase();
    if (input.startsWith('/')) {
      switch (input) {
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
          console.log(chalk.gray('Exiting application. Goodbye!'));
          rl.close();
          process.exit(0);
          break;
        default:
          console.log(chalk.red('Unknown command. Use /help for a list of commands.'));
      }
    } else {
      console.log(chalk.yellow('Please enter a command starting with "/" (e.g., /help)'));
    }
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.red('Goodbye!'));
    process.exit(0);
  });
}

main();