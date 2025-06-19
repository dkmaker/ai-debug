#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { coverageCommand } from './commands/coverage.js';
import { docsCommand } from './commands/docs.js';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { statsCommand } from './commands/stats.js';
import { suggestCommand } from './commands/suggest.js';
import { viewCommand } from './commands/view.js';
import { watchCommand } from './commands/watch.js';

const program = new Command();

program
  .name('ai-debug')
  .description('AI-optimized debugging and caching system for Node.js applications')
  .version('0.1.0');

// Add commands
program.addCommand(initCommand);
program.addCommand(docsCommand);
program.addCommand(analyzeCommand);
program.addCommand(viewCommand);
program.addCommand(listCommand);
program.addCommand(searchCommand);
program.addCommand(statsCommand);
program.addCommand(coverageCommand);
program.addCommand(suggestCommand);
program.addCommand(watchCommand);

// Parse arguments
program.parse();
