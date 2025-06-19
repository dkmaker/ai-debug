import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import type { DebugEntry } from '../../types/index.js';

/**
 * CLI command for listing debug entries.
 * Displays recent debug operations with filtering and sorting.
 *
 * @const listCommand
 *
 * Options:
 * - -l, --limit <number>: Limit number of entries (default: 50)
 * - -t, --template <template>: Filter by template name
 * - -s, --status <status>: Filter by status (success/failure)
 * - --sort <field>: Sort by field (timestamp/duration/action)
 *
 * Displays:
 * - Operation name and template
 * - Success/failure status
 * - Execution time
 * - Cache hit indicator
 * - Error messages if failed
 * - Summary statistics
 *
 * @example
 * # List recent 50 entries
 * npx ai-debug list
 *
 * @example
 * # Show only failures
 * npx ai-debug list --status failure
 *
 * @example
 * # Show slowest operations
 * npx ai-debug list --sort duration --limit 10
 */
export const listCommand = new Command('list')
  .description('List all debug entries')
  .option('-l, --limit <number>', 'Limit number of entries', '50')
  .option('-t, --template <template>', 'Filter by template')
  .option('-s, --status <status>', 'Filter by status (success/failure)')
  .option('--sort <field>', 'Sort by field (timestamp/duration/action)', 'timestamp')
  .action(async (options) => {
    try {
      const debugDir = join(process.cwd(), 'debug');

      if (!existsSync(debugDir)) {
        console.log(chalk.yellow('⚠️  No debug directory found.'));
        console.log(chalk.gray('Run your application with debug enabled first.'));
        return;
      }

      // Find all debug log files
      const logFiles = readdirSync(debugDir).filter((file) => file.endsWith('.log'));

      if (logFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No debug logs found.'));
        return;
      }

      const entries: DebugEntry[] = [];

      // Read and parse all log files
      for (const logFile of logFiles) {
        const logPath = join(debugDir, logFile);
        const content = readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as DebugEntry;

            // Apply filters
            if (options.template && entry.templateUsed !== options.template) continue;
            if (options.status && entry.status !== options.status) continue;

            entries.push(entry);
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      // Sort entries
      entries.sort((a, b) => {
        switch (options.sort) {
          case 'duration':
            return b.duration_ms - a.duration_ms;
          case 'action':
            return a.action.localeCompare(b.action);
          default: // timestamp
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
      });

      // Apply limit
      const limit = Number.parseInt(options.limit, 10);
      const displayEntries = entries.slice(0, limit);

      // Display results
      console.log(
        chalk.blue(`📋 Debug Entries (showing ${displayEntries.length} of ${entries.length})\n`),
      );

      for (const entry of displayEntries) {
        const time = new Date(entry.timestamp).toLocaleString();
        const status = entry.status === 'success' ? chalk.green('✓') : chalk.red('✗');
        const cached = entry.cached ? chalk.cyan(' [cached]') : '';
        const template = entry.templateUsed ? chalk.gray(` (${entry.templateUsed})`) : '';

        console.log(`${status} ${chalk.bold(entry.action)}${template}${cached}`);
        console.log(`  ${chalk.gray(time)} - ${chalk.yellow(`${entry.duration_ms}ms`)}`);

        if (entry.error) {
          console.log(`  ${chalk.red('Error:')} ${entry.error}`);
        }

        console.log();
      }

      // Summary
      if (entries.length > displayEntries.length) {
        console.log(chalk.gray(`... and ${entries.length - displayEntries.length} more entries`));
      }

      // Stats
      const successCount = entries.filter((e) => e.status === 'success').length;
      const failureCount = entries.filter((e) => e.status === 'failure').length;
      const cachedCount = entries.filter((e) => e.cached).length;
      const avgDuration = entries.reduce((sum, e) => sum + e.duration_ms, 0) / entries.length;

      console.log(chalk.blue('\n📊 Summary:'));
      console.log(`Total entries: ${entries.length}`);
      console.log(`Success: ${chalk.green(successCount)} | Failure: ${chalk.red(failureCount)}`);
      console.log(
        `Cached: ${chalk.cyan(cachedCount)} (${((cachedCount / entries.length) * 100).toFixed(1)}%)`,
      );
      console.log(`Average duration: ${chalk.yellow(`${avgDuration.toFixed(2)}ms`)}`);
    } catch (error) {
      console.log(chalk.red('❌ Failed to list debug entries:'));
      console.log(chalk.red((error as Error).message));
    }
  });
