import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import type { DebugEntry } from '../../types/index.js';

interface Stats {
  totalEntries: number;
  successCount: number;
  failureCount: number;
  cachedCount: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  actionCounts: Map<string, number>;
  templateCounts: Map<string, number>;
  errorCounts: Map<string, number>;
  hourlyDistribution: Map<number, number>;
  cacheHitRate: number;
  totalSize: number;
}

export const statsCommand = new Command('stats')
  .description('Show debug statistics')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
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

      const stats: Stats = {
        totalEntries: 0,
        successCount: 0,
        failureCount: 0,
        cachedCount: 0,
        totalDuration: 0,
        minDuration: Number.POSITIVE_INFINITY,
        maxDuration: 0,
        avgDuration: 0,
        actionCounts: new Map(),
        templateCounts: new Map(),
        errorCounts: new Map(),
        hourlyDistribution: new Map(),
        cacheHitRate: 0,
        totalSize: 0,
      };

      // Process all log files
      for (const logFile of logFiles) {
        const logPath = join(debugDir, logFile);
        const fileStats = statSync(logPath);
        stats.totalSize += fileStats.size;

        const content = readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as DebugEntry;
            processEntry(entry, stats);
          } catch {
            // Skip invalid entries
          }
        }
      }

      // Calculate derived stats
      stats.avgDuration = stats.totalEntries > 0 ? stats.totalDuration / stats.totalEntries : 0;
      stats.cacheHitRate =
        stats.totalEntries > 0 ? (stats.cachedCount / stats.totalEntries) * 100 : 0;

      if (options.json) {
        // Output as JSON
        const jsonOutput = {
          totalEntries: stats.totalEntries,
          successCount: stats.successCount,
          failureCount: stats.failureCount,
          cachedCount: stats.cachedCount,
          cacheHitRate: stats.cacheHitRate,
          durations: {
            min: stats.minDuration === Number.POSITIVE_INFINITY ? 0 : stats.minDuration,
            max: stats.maxDuration,
            avg: stats.avgDuration,
            total: stats.totalDuration,
          },
          topActions: Array.from(stats.actionCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([action, count]) => ({ action, count })),
          templates: Object.fromEntries(stats.templateCounts),
          topErrors: Array.from(stats.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([error, count]) => ({ error, count })),
          totalSizeBytes: stats.totalSize,
        };
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        // Display formatted stats
        displayStats(stats);
      }
    } catch (error) {
      console.log(chalk.red('❌ Failed to generate statistics:'));
      console.log(chalk.red((error as Error).message));
    }
  });

function processEntry(entry: DebugEntry, stats: Stats): void {
  stats.totalEntries++;

  // Status counts
  if (entry.status === 'success') {
    stats.successCount++;
  } else {
    stats.failureCount++;
  }

  // Cache counts
  if (entry.cached) {
    stats.cachedCount++;
  }

  // Duration stats
  stats.totalDuration += entry.duration_ms;
  stats.minDuration = Math.min(stats.minDuration, entry.duration_ms);
  stats.maxDuration = Math.max(stats.maxDuration, entry.duration_ms);

  // Action counts
  stats.actionCounts.set(entry.action, (stats.actionCounts.get(entry.action) || 0) + 1);

  // Template counts
  const template = entry.templateUsed || 'base';
  stats.templateCounts.set(template, (stats.templateCounts.get(template) || 0) + 1);

  // Error counts
  if (entry.error) {
    const errorKey = entry.error.split('\n')[0].substring(0, 50);
    stats.errorCounts.set(errorKey, (stats.errorCounts.get(errorKey) || 0) + 1);
  }

  // Hourly distribution
  const hour = new Date(entry.timestamp).getHours();
  stats.hourlyDistribution.set(hour, (stats.hourlyDistribution.get(hour) || 0) + 1);
}

function displayStats(stats: Stats): void {
  console.log(chalk.blue('📊 Debug Statistics\n'));

  // Overview
  console.log(chalk.bold('Overview:'));
  console.log(`Total entries: ${chalk.cyan(stats.totalEntries)}`);
  console.log(
    `Success: ${chalk.green(stats.successCount)} (${((stats.successCount / stats.totalEntries) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Failure: ${chalk.red(stats.failureCount)} (${((stats.failureCount / stats.totalEntries) * 100).toFixed(1)}%)`,
  );
  console.log(`Cache hits: ${chalk.cyan(stats.cachedCount)} (${stats.cacheHitRate.toFixed(1)}%)`);
  console.log(`Total size: ${chalk.yellow(formatBytes(stats.totalSize))}\n`);

  // Duration stats
  console.log(chalk.bold('Performance:'));
  console.log(
    `Min duration: ${chalk.green(stats.minDuration === Number.POSITIVE_INFINITY ? '0ms' : `${stats.minDuration}ms`)}`,
  );
  console.log(`Max duration: ${chalk.red(`${stats.maxDuration}ms`)}`);
  console.log(`Avg duration: ${chalk.yellow(`${stats.avgDuration.toFixed(2)}ms`)}`);
  console.log(`Total time: ${chalk.cyan(formatDuration(stats.totalDuration))}\n`);

  // Top actions
  console.log(chalk.bold('Top 10 Actions:'));
  const topActions = Array.from(stats.actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  topActions.forEach(([action, count]) => {
    const percentage = ((count / stats.totalEntries) * 100).toFixed(1);
    console.log(`  ${chalk.cyan(action)}: ${count} (${percentage}%)`);
  });
  console.log();

  // Template usage
  console.log(chalk.bold('Template Usage:'));
  stats.templateCounts.forEach((count, template) => {
    const percentage = ((count / stats.totalEntries) * 100).toFixed(1);
    console.log(`  ${chalk.cyan(template)}: ${count} (${percentage}%)`);
  });
  console.log();

  // Top errors
  if (stats.errorCounts.size > 0) {
    console.log(chalk.bold('Top Errors:'));
    const topErrors = Array.from(stats.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    topErrors.forEach(([error, count]) => {
      console.log(`  ${chalk.red(error)}: ${count} times`);
    });
    console.log();
  }

  // Activity heatmap (simple)
  console.log(chalk.bold('Activity by Hour:'));
  const maxHourCount = Math.max(...stats.hourlyDistribution.values());

  for (let hour = 0; hour < 24; hour++) {
    const count = stats.hourlyDistribution.get(hour) || 0;
    const barLength = Math.round((count / maxHourCount) * 30);
    const bar = '█'.repeat(barLength);
    const hourStr = hour.toString().padStart(2, '0');
    console.log(`  ${hourStr}:00 ${chalk.cyan(bar)} ${count}`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}
