/**
 * Main CLI setup using commander.js
 */

import { Command } from 'commander';
import { addCommand } from './commands/add.js';
import { askCommand, handleAsk } from './commands/ask.js';
import { statusCommand } from './commands/status.js';
import { clearCommand } from './commands/clear.js';
import { initCommand } from './commands/init.js';
import { loadConfig } from './config/env.js';

const program = new Command();

program
  .name('rag')
  .description('Local-first RAG CLI application for personal documentation')
  .version('0.1.0');

// Load configuration at startup
try {
  loadConfig();
} catch (error) {
  console.error(`Configuration error: ${error}`);
  console.error('Please ensure .env file is properly configured.');
  // Don't exit for Phase 1 - allow basic commands to work without API keys
}

// Register commands
program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(askCommand);
program.addCommand(statusCommand);
program.addCommand(clearCommand);

// Default: if no command provided, treat as query
program.argument('[query...]', 'Natural language question to ask').action(async (query) => {
  if (query.length > 0) {
    // Join query array into a single string and execute ask command with default options
    const question = query.join(' ');
    const defaultOptions = { topK: '5', llm: true, stream: true };
    await handleAsk(question, defaultOptions);
  } else {
    program.help();
  }
});

program.parse(process.argv);
