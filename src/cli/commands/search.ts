import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import type { DebugEntry } from '../../types/index.js';

export const searchCommand = new Command('search')
  .description('Search debug data')
  .argument('<pattern>', 'Search pattern (regex supported)')
  .option('-f, --field <field>', 'Search in specific field (action/error/data)', 'all')
  .option('-l, --limit <number>', 'Limit results', '20')
  .option('--case-sensitive', 'Case sensitive search')
  .action(async (pattern: string, options) => {
    try {
      const debugDir = join(process.cwd(), 'debug');

      if (!existsSync(debugDir)) {
        console.log(chalk.yellow('⚠️  No debug directory found.'));
        return;
      }

      const logFiles = readdirSync(debugDir).filter((file) => file.endsWith('.log'));

      if (logFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No debug logs found.'));
        return;
      }

      // Create regex
      const flags = options.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);

      const matches: Array<{ entry: DebugEntry; matches: string[] }> = [];

      // Search through all entries
      for (const logFile of logFiles) {
        const logPath = join(debugDir, logFile);
        const content = readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as DebugEntry;
            const entryMatches: string[] = [];

            // Search in specified fields
            if (options.field === 'all' || options.field === 'action') {
              if (regex.test(entry.action)) {
                entryMatches.push(`action: "${entry.action}"`);
              }
            }

            if (options.field === 'all' || options.field === 'error') {
              if (entry.error && regex.test(entry.error)) {
                entryMatches.push(`error: "${entry.error}"`);
              }
            }

            if (options.field === 'all' || options.field === 'data') {
              const dataStr = JSON.stringify(entry.data);
              if (regex.test(dataStr)) {
                // Find specific matches in data
                const dataMatches = findMatches(entry.data, regex);
                entryMatches.push(...dataMatches);
              }
            }

            if (entryMatches.length > 0) {
              matches.push({ entry, matches: entryMatches });
            }
          } catch {
            // Skip invalid entries
          }
        }
      }

      // Display results
      const limit = Number.parseInt(options.limit, 10);
      const displayMatches = matches.slice(0, limit);

      console.log(
        chalk.blue(
          `🔍 Search Results for "${pattern}" (${displayMatches.length} of ${matches.length} matches)\n`,
        ),
      );

      for (const { entry, matches: entryMatches } of displayMatches) {
        const time = new Date(entry.timestamp).toLocaleString();
        const status = entry.status === 'success' ? chalk.green('✓') : chalk.red('✗');
        const template = entry.templateUsed ? chalk.gray(` (${entry.templateUsed})`) : '';

        console.log(`${status} ${chalk.bold(entry.action)}${template}`);
        console.log(`  ${chalk.gray(time)} - ${chalk.yellow(`${entry.duration_ms}ms`)}`);

        // Highlight matches
        console.log(chalk.cyan('  Matches:'));
        entryMatches.forEach((match) => {
          const highlighted = match.replace(regex, (m) => chalk.bgYellow.black(m));
          console.log(`    ${highlighted}`);
        });

        console.log();
      }

      if (matches.length > displayMatches.length) {
        console.log(chalk.gray(`... and ${matches.length - displayMatches.length} more matches`));
      }

      if (matches.length === 0) {
        console.log(chalk.yellow('No matches found.'));
      }
    } catch (error) {
      console.log(chalk.red('❌ Search failed:'));
      console.log(chalk.red((error as Error).message));
    }
  });

function findMatches(obj: unknown, regex: RegExp, path = 'data'): string[] {
  const matches: string[] = [];

  if (typeof obj === 'string' && regex.test(obj)) {
    matches.push(`${path}: "${obj}"`);
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && regex.test(value)) {
        matches.push(`${path}.${key}: "${value}"`);
      } else if (typeof value === 'object') {
        matches.push(...findMatches(value, regex, `${path}.${key}`));
      }
    }
  }

  return matches;
}
