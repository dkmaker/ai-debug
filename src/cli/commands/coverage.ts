import chalk from 'chalk';
import { Command } from 'commander';
import { ProjectAnalyzer } from '../../docs/analyzer.js';

export const coverageCommand = new Command('coverage')
  .description('Show debug coverage analysis')
  .option('--json', 'Output as JSON')
  .option('--threshold <number>', 'Coverage threshold percentage', '80')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📊 Analyzing debug coverage...\n'));

      const analyzer = new ProjectAnalyzer();
      const debugCalls = await analyzer.findDebugCalls();
      const coverage = await analyzer.calculateCoverage(debugCalls);

      if (options.json) {
        // JSON output
        console.log(JSON.stringify(coverage, null, 2));
        return;
      }

      // Display coverage report
      const threshold = Number.parseFloat(options.threshold);
      const isGood = coverage.overall >= threshold;
      const statusColor = isGood ? chalk.green : chalk.red;

      console.log(chalk.bold('Overall Coverage:'));
      console.log(
        `${statusColor(`${coverage.overall.toFixed(1)}%`)} (${coverage.asyncOperations.wrapped}/${coverage.asyncOperations.total} operations)`,
      );
      console.log();

      // Template distribution
      if (coverage.byTemplate.length > 0) {
        console.log(chalk.bold('Template Usage:'));
        coverage.byTemplate.forEach((template) => {
          const bar = generateBar(template.percentage);
          console.log(
            `  ${template.template.padEnd(10)} ${bar} ${template.count} (${template.percentage.toFixed(1)}%)`,
          );
        });
        console.log();
      }

      // File coverage
      console.log(chalk.bold('File Coverage:'));

      // Sort files by coverage
      const sortedFiles = [...coverage.byFile].sort((a, b) => {
        // Show files with low coverage first
        if (a.coverage < 50 && b.coverage >= 50) return -1;
        if (a.coverage >= 50 && b.coverage < 50) return 1;
        return b.debugCalls - a.debugCalls;
      });

      // Show top 10 files needing attention
      const filesNeedingAttention = sortedFiles.filter(
        (f) => f.coverage < threshold && f.asyncCalls > 0,
      );
      const wellCoveredFiles = sortedFiles.filter((f) => f.coverage >= threshold);

      if (filesNeedingAttention.length > 0) {
        console.log(chalk.red('  Files needing attention:'));
        filesNeedingAttention.slice(0, 10).forEach((file) => {
          const coverageStr = file.coverage.toFixed(1).padStart(5);
          const bar = generateBar(file.coverage);
          console.log(`    ${chalk.red(`${coverageStr}%`)} ${bar} ${file.file}`);
          console.log(
            `          ${chalk.gray(`${file.debugCalls}/${file.asyncCalls} operations wrapped`)}`,
          );
        });
        console.log();
      }

      if (wellCoveredFiles.length > 0) {
        console.log(chalk.green('  Well-covered files:'));
        wellCoveredFiles.slice(0, 5).forEach((file) => {
          const coverageStr = file.coverage.toFixed(1).padStart(5);
          const bar = generateBar(file.coverage);
          console.log(`    ${chalk.green(`${coverageStr}%`)} ${bar} ${file.file}`);
        });
        console.log();
      }

      // Unwrapped operations
      if (coverage.asyncOperations.unwrapped.length > 0) {
        console.log(chalk.bold('Unwrapped Operations (top 10):'));
        coverage.asyncOperations.unwrapped.slice(0, 10).forEach((op, index) => {
          console.log(`  ${index + 1}. ${chalk.yellow(op)}`);
        });
        console.log();
      }

      // Summary
      console.log(chalk.bold('Summary:'));
      if (isGood) {
        console.log(chalk.green(`✅ Coverage is above threshold (${threshold}%)`));
      } else {
        console.log(chalk.red(`❌ Coverage is below threshold (${threshold}%)`));
        console.log(
          chalk.yellow(
            `   Add debug wrapping to ${coverage.asyncOperations.total - coverage.asyncOperations.wrapped} more operations`,
          ),
        );
      }

      // Suggestions
      if (filesNeedingAttention.length > 0) {
        console.log();
        console.log(chalk.bold('💡 Quick wins:'));
        console.log('1. Focus on files with many unwrapped async operations');
        console.log('2. Use appropriate templates for better insights');
        console.log('3. Run `npx ai-debug suggest` for specific recommendations');
      }
    } catch (error) {
      console.log(chalk.red('❌ Coverage analysis failed:'));
      console.log(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

function generateBar(percentage: number): string {
  const width = 20;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const filledChar = '█';
  const emptyChar = '░';

  const color = percentage >= 80 ? chalk.green : percentage >= 50 ? chalk.yellow : chalk.red;

  return color(filledChar.repeat(filled)) + chalk.gray(emptyChar.repeat(empty));
}
