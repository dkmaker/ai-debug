import { watch } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { ProjectAnalyzer } from '../../docs/analyzer.js';
import { AIDocGenerator } from '../../docs/generator.js';
import type { ProjectAnalysis } from '../../docs/generator.js';

/**
 * Watch analysis data without suggestions.
 * @private
 */
interface WatchAnalysis extends Omit<ProjectAnalysis, 'suggestions'> {
  suggestions?: ProjectAnalysis['suggestions'];
}

/**
 * CLI command for watching code changes and auto-updating docs.
 * Monitors source files and regenerates documentation when needed.
 *
 * @const watchCommand
 *
 * Options:
 * - --auto-doc: Automatically update documentation on significant changes
 * - --interval <ms>: Minimum interval between updates (default: 60000)
 * - --threshold <number>: File change threshold to trigger update (default: 5)
 *
 * Monitors:
 * - Source file changes (js, jsx, ts, tsx)
 * - Debug call additions/removals
 * - Coverage changes
 * - Pattern changes
 *
 * Auto-updates when:
 * - Coverage changes by >5%
 * - Debug calls change by >10
 * - New patterns are detected
 *
 * @example
 * # Watch mode with manual documentation updates
 * npx ai-debug watch
 *
 * @example
 * # Auto-update documentation on changes
 * npx ai-debug watch --auto-doc
 *
 * @example
 * # Frequent updates with low threshold
 * npx ai-debug watch --auto-doc --interval 30000 --threshold 3
 */
export const watchCommand = new Command('watch')
  .description('Watch for changes and auto-update documentation')
  .option('--auto-doc', 'Automatically update documentation on significant changes')
  .option('--interval <ms>', 'Minimum interval between doc updates (ms)', '60000')
  .option('--threshold <number>', 'Change threshold to trigger update', '5')
  .action(async (options) => {
    console.log(chalk.blue('👁️  Starting watch mode...\n'));

    const projectRoot = process.cwd();
    const watchPaths = [
      join(projectRoot, 'src'),
      join(projectRoot, 'lib'),
      join(projectRoot, 'app'),
    ];

    let changeCount = 0;
    let lastDocUpdate = Date.now();
    let isUpdating = false;
    const changeThreshold = Number.parseInt(options.threshold, 10);
    const updateInterval = Number.parseInt(options.interval, 10);

    const analyzer = new ProjectAnalyzer();
    const docGenerator = new AIDocGenerator();

    // Initial analysis
    console.log(chalk.gray('Performing initial analysis...'));
    const debugCalls = await analyzer.findDebugCalls();
    const patterns = await analyzer.identifyPatterns(debugCalls);
    const coverage = await analyzer.calculateCoverage(debugCalls);
    const templates = await analyzer.detectTemplates(debugCalls);

    const initialAnalysis = {
      debugCalls,
      patterns,
      coverage,
      templates,
    };
    displaySummary(initialAnalysis);

    // Watch for changes
    const watchers = watchPaths
      .map((path) => {
        try {
          return watch(path, { recursive: true }, async (eventType, filename) => {
            if (!filename || filename.includes('node_modules') || filename.includes('.git')) {
              return;
            }

            // Skip non-code files
            if (!filename.match(/\.(js|jsx|ts|tsx)$/)) {
              return;
            }

            changeCount++;
            console.log(
              chalk.gray(`[${new Date().toLocaleTimeString()}] ${eventType}: ${filename}`),
            );

            // Check if we should update documentation
            if (
              options.autoDoc &&
              !isUpdating &&
              changeCount >= changeThreshold &&
              Date.now() - lastDocUpdate >= updateInterval
            ) {
              await updateDocumentation();
            }
          });
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Cannot watch ${path}: ${(error as Error).message}`));
          return null;
        }
      })
      .filter(Boolean);

    if (watchers.length === 0) {
      console.log(chalk.red('❌ No directories could be watched.'));
      process.exit(1);
    }

    console.log(chalk.green(`\n✅ Watching ${watchers.length} directories for changes...`));
    console.log(chalk.gray('Press Ctrl+C to stop.\n'));

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n👋 Stopping watch mode...'));
      watchers.forEach((watcher) => watcher?.close());
      process.exit(0);
    });

    // Keep process running
    await new Promise(() => {});

    async function updateDocumentation(): Promise<void> {
      isUpdating = true;
      changeCount = 0;
      lastDocUpdate = Date.now();

      try {
        console.log(chalk.blue('\n📝 Updating documentation...'));

        const newDebugCalls = await analyzer.findDebugCalls();
        const newPatterns = await analyzer.identifyPatterns(newDebugCalls);
        const newCoverage = await analyzer.calculateCoverage(newDebugCalls);
        const newTemplates = await analyzer.detectTemplates(newDebugCalls);

        const analysis = {
          debugCalls: newDebugCalls,
          patterns: newPatterns,
          coverage: newCoverage,
          templates: newTemplates,
          suggestions: [], // Not needed for watch mode
        };
        const hasSignificantChanges = detectSignificantChanges(initialAnalysis, analysis);

        if (hasSignificantChanges) {
          await docGenerator.generate({
            format: 'claude',
            output: './CLAUDE.md',
            update: true,
          });
          console.log(chalk.green('✅ Documentation updated successfully!'));
        } else {
          console.log(chalk.gray('No significant changes detected, skipping update.'));
        }

        displayChanges(initialAnalysis, analysis);
      } catch (error) {
        console.log(chalk.red('❌ Failed to update documentation:'));
        console.log(chalk.red((error as Error).message));
      } finally {
        isUpdating = false;
      }
    }
  });

function displaySummary(analysis: WatchAnalysis): void {
  console.log(chalk.cyan('\n📊 Current State:'));
  console.log(`  Debug calls: ${analysis.debugCalls.length}`);
  console.log(`  Coverage: ${analysis.coverage.overall.toFixed(1)}%`);
  console.log(`  Templates in use: ${analysis.templates.filter((t) => t.usage > 0).length}`);
  console.log(`  Patterns detected: ${analysis.patterns.length}`);
}

function detectSignificantChanges(oldAnalysis: WatchAnalysis, newAnalysis: WatchAnalysis): boolean {
  // Significant changes include:
  // - Coverage change > 5%
  // - New patterns detected
  // - Template usage changes
  // - New debug calls added/removed > 10

  const coverageChange = Math.abs(newAnalysis.coverage.overall - oldAnalysis.coverage.overall);
  const debugCallChange = Math.abs(newAnalysis.debugCalls.length - oldAnalysis.debugCalls.length);
  const newPatterns = newAnalysis.patterns.length !== oldAnalysis.patterns.length;

  return coverageChange > 5 || debugCallChange > 10 || newPatterns;
}

function displayChanges(oldAnalysis: WatchAnalysis, newAnalysis: WatchAnalysis): void {
  const debugCallDiff = newAnalysis.debugCalls.length - oldAnalysis.debugCalls.length;
  const coverageDiff = newAnalysis.coverage.overall - oldAnalysis.coverage.overall;

  console.log(chalk.cyan('\n📈 Changes detected:'));

  if (debugCallDiff !== 0) {
    const sign = debugCallDiff > 0 ? '+' : '';
    const color = debugCallDiff > 0 ? chalk.green : chalk.red;
    console.log(`  Debug calls: ${color(sign + debugCallDiff)}`);
  }

  if (Math.abs(coverageDiff) > 0.1) {
    const sign = coverageDiff > 0 ? '+' : '';
    const color = coverageDiff > 0 ? chalk.green : chalk.red;
    console.log(`  Coverage: ${color(`${sign}${coverageDiff.toFixed(1)}%`)}`);
  }
}
