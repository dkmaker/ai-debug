import chalk from 'chalk';
import { Command } from 'commander';
import { AIDocGenerator } from '../../docs/generator.js';

/**
 * CLI command for generating AI-optimized documentation.
 * Creates documentation tailored for AI assistants.
 *
 * @const docsCommand
 *
 * Options:
 * - --format <format>: Documentation format (claude, github, cursor)
 * - --output <path>: Output file path
 * - --update: Update existing documentation
 *
 * Generates documentation containing:
 * - Debug patterns and usage examples
 * - Template documentation
 * - Coverage analysis
 * - Best practices specific to the project
 * - Custom action mappings
 *
 * Output paths default to:
 * - claude: ./CLAUDE.md
 * - github: ./.github/copilot-guide.md
 * - cursor: ./.cursorrules
 *
 * @example
 * # Generate Claude-optimized docs
 * npx ai-debug docs:generate
 *
 * @example
 * # Generate for GitHub Copilot
 * npx ai-debug docs:generate --format github
 *
 * @example
 * # Update existing documentation
 * npx ai-debug docs:generate --update
 */
export const docsCommand = new Command('docs:generate')
  .description('Generate AI-optimized documentation')
  .option('--format <format>', 'Documentation format (claude|github|cursor)', 'claude')
  .option('--output <path>', 'Output path', './CLAUDE.md')
  .option('--update', 'Update existing documentation')
  .action(async (options) => {
    try {
      // Validate format
      if (!['claude', 'github', 'cursor'].includes(options.format)) {
        console.log(chalk.red(`❌ Invalid format: ${options.format}`));
        console.log(chalk.gray('Valid formats: claude, github, cursor'));
        process.exit(1);
      }

      // Adjust output path based on format if using default
      if (options.output === './CLAUDE.md') {
        const formatPaths: Record<string, string> = {
          claude: './CLAUDE.md',
          github: './.github/copilot-guide.md',
          cursor: './.cursorrules',
        };
        options.output = formatPaths[options.format as keyof typeof formatPaths];
      }

      const generator = new AIDocGenerator();
      await generator.generate({
        format: options.format as 'claude' | 'github' | 'cursor',
        output: options.output,
        update: options.update,
      });
    } catch (error) {
      console.log(chalk.red('❌ Documentation generation failed:'));
      console.log(chalk.red((error as Error).message));
      process.exit(1);
    }
  });
