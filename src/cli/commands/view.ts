import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import type { DebugEntry } from '../../types/index.js';

export const viewCommand = new Command('view')
  .description('View debug entries for a specific action')
  .argument('<action>', 'Action name to view')
  .option('-l, --limit <number>', 'Limit number of entries', '10')
  .option('--json', 'Output as JSON')
  .option('--full', 'Show full debug data')
  .action(async (action: string, options) => {
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

      // Search for matching entries
      for (const logFile of logFiles) {
        const logPath = join(debugDir, logFile);
        const content = readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as DebugEntry;

            // Check if action matches (supports wildcards)
            if (matchesAction(entry.action, action)) {
              entries.push(entry);
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      if (entries.length === 0) {
        console.log(chalk.yellow(`⚠️  No entries found for action: ${action}`));
        console.log(chalk.gray('Try using wildcards, e.g., "fetch_*" or "*_user"'));
        return;
      }

      // Sort by timestamp (newest first)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      const limit = Number.parseInt(options.limit, 10);
      const displayEntries = entries.slice(0, limit);

      if (options.json) {
        console.log(JSON.stringify(displayEntries, null, 2));
        return;
      }

      // Display entries
      console.log(
        chalk.blue(
          `👁️  Debug entries for "${action}" (${displayEntries.length} of ${entries.length})\n`,
        ),
      );

      displayEntries.forEach((entry, index) => {
        displayDebugEntry(entry, index + 1, options.full);
      });

      if (entries.length > displayEntries.length) {
        console.log(chalk.gray(`\n... and ${entries.length - displayEntries.length} more entries`));
      }

      // Show summary statistics
      displaySummary(entries);
    } catch (error) {
      console.log(chalk.red('❌ Failed to view debug entries:'));
      console.log(chalk.red((error as Error).message));
    }
  });

function matchesAction(entryAction: string, pattern: string): boolean {
  // Convert wildcard pattern to regex
  const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(entryAction);
}

function displayDebugEntry(entry: DebugEntry, index: number, showFull: boolean): void {
  const time = new Date(entry.timestamp).toLocaleString();
  const status = entry.status === 'success' ? chalk.green('✓') : chalk.red('✗');
  const cached = entry.cached ? chalk.cyan(' [cached]') : '';
  const template = entry.templateUsed ? chalk.gray(` (${entry.templateUsed})`) : '';

  console.log(`${index}. ${status} ${chalk.bold(entry.action)}${template}${cached}`);
  console.log(`   ${chalk.gray(time)} - ${chalk.yellow(`${entry.duration_ms}ms`)}`);
  console.log(`   ID: ${chalk.gray(entry.id)}`);

  if (entry.error) {
    console.log(`   ${chalk.red('Error:')} ${entry.error}`);
  }

  if (showFull) {
    console.log(`   ${chalk.cyan('Data:')}`);
    const dataStr = JSON.stringify(entry.data, null, 2);
    const lines = dataStr.split('\n');
    lines.forEach((line) => {
      console.log(`   ${chalk.gray(line)}`);
    });
  } else {
    // Show preview of data
    const dataStr = JSON.stringify(entry.data);
    if (dataStr.length > 100) {
      console.log(`   ${chalk.cyan('Data:')} ${chalk.gray(`${dataStr.substring(0, 100)}...`)}`);
    } else {
      console.log(`   ${chalk.cyan('Data:')} ${chalk.gray(dataStr)}`);
    }
  }

  console.log();
}

function displaySummary(entries: DebugEntry[]): void {
  const successCount = entries.filter((e) => e.status === 'success').length;
  const failureCount = entries.filter((e) => e.status === 'failure').length;
  const cachedCount = entries.filter((e) => e.cached).length;
  const durations = entries.map((e) => e.duration_ms);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log(chalk.blue('📊 Summary:'));
  console.log(`Total entries: ${entries.length}`);
  console.log(`Success: ${chalk.green(successCount)} | Failure: ${chalk.red(failureCount)}`);
  console.log(
    `Cache hits: ${chalk.cyan(cachedCount)} (${((cachedCount / entries.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Duration - Min: ${chalk.green(`${minDuration}ms`)} | Avg: ${chalk.yellow(`${avgDuration.toFixed(2)}ms`)} | Max: ${chalk.red(`${maxDuration}ms`)}`,
  );

  // Template distribution
  const templateCounts = new Map<string, number>();
  entries.forEach((entry) => {
    const template = entry.templateUsed || 'base';
    templateCounts.set(template, (templateCounts.get(template) || 0) + 1);
  });

  if (templateCounts.size > 0) {
    console.log('\nTemplates used:');
    templateCounts.forEach((count, template) => {
      const percentage = ((count / entries.length) * 100).toFixed(1);
      console.log(`  ${template}: ${count} (${percentage}%)`);
    });
  }
}
