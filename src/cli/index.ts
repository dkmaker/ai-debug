#!/usr/bin/env node
/**
 * CLI entry point for @dkmaker/ai-debug.
 * Provides commands for initialization, documentation, and analysis.
 *
 * Available commands:
 * - init: Initialize ai-debug in a project
 * - docs: Copy AI-optimized documentation to your project
 * - analyze: Analyze debug patterns in codebase
 * - view: View debug logs
 * - list: List debug entries
 * - search: Search debug logs
 * - stats: Show debug statistics
 * - coverage: Analyze debug coverage
 * - suggest: Suggest debug improvements
 * - watch: Watch debug logs in real-time
 *
 * @example
 * # Initialize in a project
 * npx ai-debug init --guided
 *
 * # Generate documentation
 * npx ai-debug docs:generate
 *
 * # View debug statistics
 * npx ai-debug stats
 */
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { coverageCommand } from './commands/coverage.js';
import { docsCopyCommand } from './commands/docs-copy.js';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { statsCommand } from './commands/stats.js';
import { suggestCommand } from './commands/suggest.js';
import { viewCommand } from './commands/view.js';
import { watchCommand } from './commands/watch.js';

// Version will be injected at build time
declare const __PACKAGE_VERSION__: string;
const VERSION = __PACKAGE_VERSION__;

const program = new Command();

program
  .name('ai-debug')
  .description('AI-optimized debugging and caching system for Node.js applications')
  .version(VERSION);

// Add commands
program.addCommand(initCommand);
program.addCommand(docsCopyCommand);
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
