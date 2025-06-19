import chalk from 'chalk';
import { Command } from 'commander';
import { AIDocGenerator } from '../../docs/generator.js';

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
