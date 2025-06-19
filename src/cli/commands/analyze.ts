import chalk from 'chalk';
import { Command } from 'commander';
import { ProjectAnalyzer } from '../../docs/analyzer.js';

export const analyzeCommand = new Command('analyze')
  .description('Analyze debug usage patterns')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing debug usage patterns...\n'));

      const analyzer = new ProjectAnalyzer();
      const debugCalls = await analyzer.findDebugCalls();
      const patterns = await analyzer.identifyPatterns(debugCalls);
      const templates = await analyzer.detectTemplates(debugCalls);
      const coverage = await analyzer.calculateCoverage(debugCalls);

      if (options.json) {
        const output = {
          debugCalls: debugCalls.length,
          patterns,
          templates: templates.filter((t) => t.usage > 0),
          coverage: {
            overall: coverage.overall,
            totalOperations: coverage.asyncOperations.total,
            wrappedOperations: coverage.asyncOperations.wrapped,
          },
        };
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Display analysis results
      console.log(chalk.bold('Debug Usage Analysis:\n'));

      // Overview
      console.log(chalk.cyan('📊 Overview:'));
      console.log(`Total debug calls: ${debugCalls.length}`);
      console.log(`Unique actions: ${new Set(debugCalls.map((c) => c.action)).size}`);
      console.log(`Files using debug: ${new Set(debugCalls.map((c) => c.file)).size}`);
      console.log(`Coverage: ${coverage.overall.toFixed(1)}%\n`);

      // Template usage
      console.log(chalk.cyan('📝 Template Usage:'));
      const usedTemplates = templates.filter((t) => t.usage > 0);
      if (usedTemplates.length === 0) {
        console.log(chalk.gray('  No templates in use yet'));
      } else {
        usedTemplates.forEach((template) => {
          const bar = '█'.repeat(Math.round((template.usage / debugCalls.length) * 20));
          console.log(`  ${template.name.padEnd(10)} ${chalk.green(bar)} ${template.usage} calls`);
        });
      }
      console.log();

      // Patterns
      if (patterns.length > 0) {
        console.log(chalk.cyan('🔄 Detected Patterns:'));

        const commonPatterns = patterns.filter((p) => p.type === 'common');
        const antiPatterns = patterns.filter((p) => p.type === 'antipattern');

        if (commonPatterns.length > 0) {
          console.log(chalk.green('  Common patterns:'));
          commonPatterns.forEach((pattern) => {
            console.log(`    • ${pattern.name} (${pattern.occurrences} occurrences)`);
            if (pattern.description) {
              console.log(`      ${chalk.gray(pattern.description)}`);
            }
          });
        }

        if (antiPatterns.length > 0) {
          console.log(chalk.red('\n  Anti-patterns detected:'));
          antiPatterns.forEach((pattern) => {
            console.log(`    ⚠️  ${pattern.name}`);
            console.log(`      ${chalk.gray(pattern.description)}`);
            console.log(`      Found in ${pattern.occurrences} places`);
          });
        }
        console.log();
      } else {
        console.log(chalk.gray('No significant patterns detected yet\n'));
      }

      // Action grouping
      const actionPrefixes = new Map<string, number>();
      debugCalls.forEach((call) => {
        const prefix = call.action.split('_')[0];
        actionPrefixes.set(prefix, (actionPrefixes.get(prefix) || 0) + 1);
      });

      if (actionPrefixes.size > 0) {
        console.log(chalk.cyan('🏷️  Action Categories:'));
        const sortedPrefixes = Array.from(actionPrefixes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        sortedPrefixes.forEach(([prefix, count]) => {
          const percentage = ((count / debugCalls.length) * 100).toFixed(1);
          console.log(`  ${prefix}*: ${count} actions (${percentage}%)`);
        });
        console.log();
      }

      // Recommendations
      console.log(chalk.cyan('💡 Recommendations:'));

      if (coverage.overall < 50) {
        console.log(chalk.yellow('  • Coverage is low - consider wrapping more async operations'));
      }

      if (usedTemplates.length === 1 && usedTemplates[0].name === 'base') {
        console.log(
          chalk.yellow(
            '  • Only using base template - consider using specific templates for better insights',
          ),
        );
      }

      const antiPatterns = patterns.filter((p) => p.type === 'antipattern');
      if (antiPatterns.length > 0) {
        console.log(chalk.yellow('  • Address anti-patterns for better debugging experience'));
      }

      if (debugCalls.length === 0) {
        console.log(
          chalk.red('  • No debug calls found - start by wrapping critical async operations'),
        );
      } else if (coverage.overall > 80) {
        console.log(chalk.green('  • Excellent coverage! Keep up the good work'));
      }

      console.log('\nRun `npx ai-debug suggest` for specific optimization recommendations');
    } catch (error) {
      console.log(chalk.red('❌ Analysis failed:'));
      console.log(chalk.red((error as Error).message));
      process.exit(1);
    }
  });
