import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import type { Config } from '../../types/index.js';
import { generateConfig } from '../generators/config.js';
import { generateWrapper } from '../generators/wrapper.js';

export const initCommand = new Command('init')
  .description('Initialize AI Debug in your project')
  .option('--guided', 'Run interactive setup')
  .option('--upgrade', 'Upgrade existing setup')
  .option('--force', 'Overwrite existing files')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Initializing AI Debug...'));

    const projectRoot = process.cwd();
    const aiDebugDir = join(projectRoot, '.ai-debug');
    const configPath = join(aiDebugDir, 'config.json');
    const wrapperPath = join(aiDebugDir, 'wrapper.js');

    // Check if already initialized
    if (existsSync(aiDebugDir) && !options.force && !options.upgrade) {
      console.log(chalk.yellow('⚠️  AI Debug is already initialized in this project.'));
      console.log(chalk.gray('Use --upgrade to update or --force to overwrite.'));
      process.exit(1);
    }

    let config: Config;

    if (options.guided) {
      // Interactive setup
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableCache',
          message: 'Enable caching?',
          default: true,
        },
        {
          type: 'list',
          name: 'cacheStrategy',
          message: 'Cache strategy:',
          choices: ['lru', 'fifo'],
          default: 'lru',
          when: (answers) => answers.enableCache,
        },
        {
          type: 'confirm',
          name: 'enableFileLogging',
          message: 'Enable file logging?',
          default: true,
        },
        {
          type: 'input',
          name: 'logPath',
          message: 'Log file path:',
          default: './debug/debug.log',
          when: (answers) => answers.enableFileLogging,
        },
        {
          type: 'confirm',
          name: 'enableConsoleLogging',
          message: 'Enable console logging?',
          default: false,
        },
        {
          type: 'list',
          name: 'defaultTemplate',
          message: 'Default template:',
          choices: ['base', 'http', 'database', 'file', 'queue', 'business', 'auto'],
          default: 'base',
        },
        {
          type: 'confirm',
          name: 'generateDocs',
          message: 'Generate AI documentation (CLAUDE.md)?',
          default: true,
        },
      ]);

      config = generateConfig(answers);
    } else {
      // Use default config
      config = generateConfig({});
    }

    // Create .ai-debug directory
    if (!existsSync(aiDebugDir)) {
      mkdirSync(aiDebugDir, { recursive: true });
    }

    // Write config.json
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green('✓ Created .ai-debug/config.json'));

    // Generate wrapper.js
    const wrapperContent = generateWrapper();
    writeFileSync(wrapperPath, wrapperContent);
    console.log(chalk.green('✓ Created .ai-debug/wrapper.js'));

    // Create templates directory
    const templatesDir = join(aiDebugDir, 'templates');
    if (!existsSync(templatesDir)) {
      mkdirSync(templatesDir);
    }

    // Update .gitignore
    updateGitignore(projectRoot);

    console.log(chalk.green('\n✨ AI Debug initialized successfully!'));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray('1. Import the debug wrapper in your code:'));
    console.log(chalk.cyan('   import { debug } from "./.ai-debug/wrapper.js";'));
    console.log(chalk.gray('2. Wrap your async operations:'));
    console.log(chalk.cyan('   const result = await debug.wrap("operation_name", async () => {'));
    console.log(chalk.cyan('     // Your async code here'));
    console.log(chalk.cyan('   });'));

    if (options.guided && config.features.documentation.autoGenerate) {
      console.log(chalk.gray('\n3. Generate AI documentation:'));
      console.log(chalk.cyan('   npx ai-debug docs:generate'));
    }
  });

function updateGitignore(projectRoot: string) {
  const gitignorePath = join(projectRoot, '.gitignore');
  const debugPatterns = ['debug/', '*.log'];

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    const lines = content.split('\n');
    const hasDebugPattern = debugPatterns.some((pattern) =>
      lines.some((line) => line.trim() === pattern),
    );

    if (!hasDebugPattern) {
      const updatedContent = `${content.trimEnd()}\n\n# AI Debug\n${debugPatterns.join('\n')}\n`;
      writeFileSync(gitignorePath, updatedContent);
      console.log(chalk.green('✓ Updated .gitignore'));
    }
  } else {
    const content = `# AI Debug\n${debugPatterns.join('\n')}\n`;
    writeFileSync(gitignorePath, content);
    console.log(chalk.green('✓ Created .gitignore'));
  }
}
