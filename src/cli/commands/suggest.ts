import chalk from 'chalk';
import { Command } from 'commander';
import { ProjectAnalyzer } from '../../docs/analyzer.js';
import type { Suggestion } from '../../docs/generator.js';

/**
 * CLI command for suggesting debug improvements.
 * Analyzes codebase and provides actionable recommendations.
 *
 * @const suggestCommand
 *
 * Options:
 * - --limit <number>: Maximum suggestions to show (default: 20)
 * - --priority <level>: Filter by priority (high/medium/low)
 * - --json: Output as JSON
 *
 * Provides:
 * - Unwrapped async operations to debug
 * - Template recommendations
 * - Code examples for implementation
 * - Priority-based organization
 *
 * @example
 * # Show all suggestions
 * npx ai-debug suggest
 *
 * @example
 * # Show only high priority suggestions
 * npx ai-debug suggest --priority high --limit 10
 */
export const suggestCommand = new Command('suggest')
  .description('Suggest debug optimizations')
  .option('--limit <number>', 'Limit number of suggestions', '20')
  .option('--priority <level>', 'Filter by priority (high/medium/low)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing codebase for optimization suggestions...\n'));

      const analyzer = new ProjectAnalyzer();
      const suggestions = await analyzer.generateSuggestions();

      // Filter by priority if specified
      let filteredSuggestions = suggestions;
      if (options.priority) {
        filteredSuggestions = suggestions.filter((s) => s.priority === options.priority);
      }

      // Apply limit
      const limit = Number.parseInt(options.limit, 10);
      const displaySuggestions = filteredSuggestions.slice(0, limit);

      if (options.json) {
        console.log(JSON.stringify(displaySuggestions, null, 2));
        return;
      }

      if (displaySuggestions.length === 0) {
        console.log(chalk.green('✨ No optimization suggestions found!'));
        console.log(chalk.gray('Your codebase has excellent debug coverage.'));
        return;
      }

      // Group by priority
      const high = displaySuggestions.filter((s) => s.priority === 'high');
      const medium = displaySuggestions.filter((s) => s.priority === 'medium');
      const low = displaySuggestions.filter((s) => s.priority === 'low');

      console.log(chalk.bold(`Found ${filteredSuggestions.length} optimization suggestions:\n`));

      // Display high priority
      if (high.length > 0) {
        console.log(chalk.red.bold('🔴 High Priority:'));
        high.forEach((suggestion, index) => {
          displaySuggestion(suggestion, index + 1);
        });
        console.log();
      }

      // Display medium priority
      if (medium.length > 0) {
        console.log(chalk.yellow.bold('🟡 Medium Priority:'));
        medium.forEach((suggestion, index) => {
          displaySuggestion(suggestion, index + 1);
        });
        console.log();
      }

      // Display low priority
      if (low.length > 0) {
        console.log(chalk.gray.bold('⚪ Low Priority:'));
        low.forEach((suggestion, index) => {
          displaySuggestion(suggestion, index + 1);
        });
        console.log();
      }

      // Show how to implement
      if (displaySuggestions.length > 0) {
        const firstSuggestion = displaySuggestions[0];
        console.log(chalk.bold('💡 Example Implementation:\n'));
        showImplementationExample(firstSuggestion);
      }

      // Summary
      if (filteredSuggestions.length > displaySuggestions.length) {
        console.log(
          chalk.gray(
            `\n... and ${filteredSuggestions.length - displaySuggestions.length} more suggestions`,
          ),
        );
      }

      console.log(chalk.bold('\n📋 Next Steps:'));
      console.log('1. Start with high-priority suggestions for maximum impact');
      console.log('2. Use the suggested templates for better insights');
      console.log('3. Run `npx ai-debug coverage` after implementing to track progress');
    } catch (error) {
      console.log(chalk.red('❌ Suggestion analysis failed:'));
      console.log(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

function displaySuggestion(suggestion: Suggestion, index: number): void {
  console.log(`\n${index}. ${chalk.cyan(suggestion.file)}:${chalk.yellow(suggestion.line)}`);
  console.log(`   Function: ${chalk.bold(suggestion.function)}`);
  console.log(`   Reason: ${suggestion.reason}`);
  console.log(`   Template: ${chalk.green(suggestion.suggestedTemplate)}`);
}

function showImplementationExample(suggestion: Suggestion): void {
  const { file, line, function: funcName, suggestedTemplate } = suggestion;

  console.log(chalk.gray(`File: ${file}:${line}`));
  console.log(chalk.gray(`Function: ${funcName}`));
  console.log();

  // Generate example based on template
  const examples: Record<string, string> = {
    http: `/*DEBUG:START*/
const result = await debug.wrap('${generateActionName(funcName)}', async () => {
  return await ${funcName}(...args);
}, {
  template: 'http',
  context: {
    url: requestUrl,
    method: 'GET',
    headers: sanitizedHeaders
  }
});
/*DEBUG:END*/`,

    database: `/*DEBUG:START*/
const result = await debug.wrap('${generateActionName(funcName)}', async () => {
  return await ${funcName}(...args);
}, {
  template: 'database',
  context: {
    query: sqlQuery,
    params: queryParams,
    table: 'users' // adjust as needed
  }
});
/*DEBUG:END*/`,

    file: `/*DEBUG:START*/
const result = await debug.wrap('${generateActionName(funcName)}', async () => {
  return await ${funcName}(...args);
}, {
  template: 'file',
  context: {
    path: filePath,
    operation: 'read' // or 'write', 'delete', etc.
  }
});
/*DEBUG:END*/`,

    queue: `/*DEBUG:START*/
const result = await debug.wrap('${generateActionName(funcName)}', async () => {
  return await ${funcName}(...args);
}, {
  template: 'queue',
  context: {
    queue: queueName,
    operation: 'send', // or 'receive', 'ack', etc.
    messageId: message.id
  }
});
/*DEBUG:END*/`,

    base: `/*DEBUG:START*/
const result = await debug.wrap('${generateActionName(funcName)}', async () => {
  return await ${funcName}(...args);
}, {
  template: 'base',
  context: {
    // Add relevant context for your operation
  }
});
/*DEBUG:END*/`,
  };

  const example = examples[suggestedTemplate] || examples.base;
  console.log(chalk.green('Before:'));
  console.log(chalk.gray(`const result = await ${funcName}(...args);`));
  console.log();
  console.log(chalk.green('After:'));
  console.log(example);
}

function generateActionName(funcName: string): string {
  // Convert function name to action name
  // e.g., getUserData -> fetch_user_data
  // e.g., db.query -> query_database

  const parts = funcName.split('.');
  const method = parts[parts.length - 1];

  // Convert camelCase to snake_case
  const snakeCase = method
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');

  // Add appropriate prefix based on method name
  if (snakeCase.includes('get') || snakeCase.includes('fetch')) {
    return `fetch_${snakeCase.replace(/^(get|fetch)_?/, '')}`;
  }
  if (snakeCase.includes('query')) {
    return `query_${snakeCase.replace(/^query_?/, '')}`;
  }
  if (snakeCase.includes('save') || snakeCase.includes('write')) {
    return `save_${snakeCase.replace(/^(save|write)_?/, '')}`;
  }

  return snakeCase;
}
