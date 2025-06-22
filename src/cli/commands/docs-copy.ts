import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Command } from 'commander';

/**
 * CLI command for copying pre-generated AI-optimized documentation.
 *
 * This command copies comprehensive documentation that was generated at build time,
 * including usage guides, configuration references, Claude integration docs,
 * and workflow diagrams.
 *
 * The documentation is versioned and stored in the package distribution,
 * ensuring consistency between the package version and documentation.
 */

interface CopyOptions {
  type: string;
  output: string;
  force: boolean;
}

interface DocumentationManifest {
  version: string;
  packageName: string;
  generatedAt: string;
  totalFiles: number;
  totalEntries: number;
  includedFeatures: {
    internal: boolean;
    external: boolean;
    claudeCommands: boolean;
    diagrams: boolean;
    examples: boolean;
    workflows: boolean;
  };
}

/**
 * CLI command for copying pre-generated documentation.
 */
export const docsCopyCommand = new Command('docs')
  .description('Copy AI-optimized documentation to your project')
  .option('--type <type>', 'Type of documentation (all|internal|external|claude|diagrams)', 'all')
  .option('--output <path>', 'Output directory', './docs-ai-debug')
  .option('--force', 'Overwrite existing documentation', false)
  .action(async (options: CopyOptions) => {
    try {
      console.log(chalk.blue('📚 Copying AI-optimized documentation...'));

      // Find the documentation source directory
      const docSource = findDocumentationSource();
      if (!docSource) {
        console.log(chalk.red('❌ No documentation found.'));
        console.log(
          chalk.gray('The documentation should be included with the package installation.'),
        );
        process.exit(1);
      }

      // Use the docs directory directly (no versioning)
      const actualSourceDir = docSource;

      // Validate source directory
      if (!existsSync(actualSourceDir)) {
        console.log(chalk.red('❌ Documentation source directory not found.'));
        process.exit(1);
      }

      // Read manifest if available
      const manifestPath = join(actualSourceDir, 'manifest.json');
      let manifest: DocumentationManifest | null = null;
      if (existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        } catch {
          // Ignore manifest parsing errors
        }
      }

      if (manifest) {
        console.log(
          chalk.green(`✅ Found documentation for ${manifest.packageName} v${manifest.version}`),
        );
        console.log(chalk.gray(`   Generated: ${new Date(manifest.generatedAt).toLocaleString()}`));
        console.log(
          chalk.gray(`   Entries: ${manifest.totalEntries}, Files: ${manifest.totalFiles}`),
        );
      }

      // Ensure output directory exists
      if (!existsSync(options.output)) {
        mkdirSync(options.output, { recursive: true });
      }

      let copiedFiles = 0;

      // Copy documentation based on type
      if (options.type === 'all' || options.type === 'internal') {
        const internalSource = join(actualSourceDir, 'internal');
        if (existsSync(internalSource)) {
          const internalTarget = join(options.output, 'internal');
          copyDirectory(internalSource, internalTarget, options.force);
          console.log(chalk.green('✅ Copied internal documentation'));
          copiedFiles++;
        }
      }

      if (options.type === 'all' || options.type === 'external') {
        const externalSource = join(actualSourceDir, 'external');
        if (existsSync(externalSource)) {
          const externalTarget = join(options.output, 'external');
          copyDirectory(externalSource, externalTarget, options.force);
          console.log(chalk.green('✅ Copied external documentation'));
          copiedFiles++;
        }
      }

      if (options.type === 'all' || options.type === 'claude') {
        const claudeSource = join(actualSourceDir, 'claude-commands');
        if (existsSync(claudeSource)) {
          const claudeTarget = join(options.output, 'claude-commands');
          copyDirectory(claudeSource, claudeTarget, options.force);
          console.log(chalk.green('✅ Copied Claude command files'));
          copiedFiles++;
        }
      }

      if (options.type === 'all' || options.type === 'diagrams') {
        const diagramSource = join(actualSourceDir, 'diagrams');
        if (existsSync(diagramSource)) {
          const diagramTarget = join(options.output, 'diagrams');
          copyDirectory(diagramSource, diagramTarget, options.force);
          console.log(chalk.green('✅ Copied Mermaid diagrams'));
          copiedFiles++;
        }
      }

      if (copiedFiles === 0) {
        console.log(chalk.yellow('⚠️  No documentation files found to copy.'));
        console.log(chalk.gray(`Requested type: ${options.type}`));
        return;
      }

      // Final summary
      console.log('');
      console.log(chalk.bold.green('🎉 Documentation copying complete!'));
      console.log(chalk.gray(`📁 Output directory: ${options.output}`));
      console.log(chalk.gray(`📄 Documentation sets copied: ${copiedFiles}`));

      if (manifest) {
        console.log(chalk.gray(`📚 Based on ${manifest.packageName} v${manifest.version}`));
      }

      // Show next steps
      console.log('');
      console.log(chalk.bold('📋 Next steps:'));

      if (options.type === 'all' || options.type === 'external') {
        console.log(
          chalk.gray("   • Merge external/CLAUDE_SECTION.md into your project's CLAUDE.md"),
        );
        console.log(chalk.gray('   • Review external/USAGE_GUIDE.md for implementation guidance'));
      }

      if (options.type === 'all' || options.type === 'claude') {
        console.log(chalk.gray('   • Use claude-commands/ files for AI-assisted development'));
        console.log(chalk.gray('   • Reference specific workflows when asking Claude for help'));
      }

      if (options.type === 'all' || options.type === 'diagrams') {
        console.log(chalk.gray('   • Include diagrams/ in your documentation'));
        console.log(chalk.gray('   • Use Mermaid diagrams to visualize system architecture'));
      }
    } catch (error) {
      console.log(chalk.red('❌ Documentation copying failed:'));
      console.log(chalk.red((error as Error).message));
      if (process.env.DEBUG) {
        console.log(chalk.gray((error as Error).stack));
      }
      process.exit(1);
    }
  });

/**
 * Finds the documentation source directory in the package installation.
 */
function findDocumentationSource(): string | null {
  try {
    // Get the directory where this script is located
    const currentFile = fileURLToPath(import.meta.url);
    const packageRoot = findPackageRoot(dirname(currentFile));

    if (packageRoot) {
      const docsPath = join(packageRoot, 'docs');
      if (existsSync(docsPath)) {
        return docsPath;
      }
    }

    // Fallback: try to find docs relative to node_modules
    const moduleRoot = findNodeModuleRoot();
    if (moduleRoot) {
      const docsPath = join(moduleRoot, 'docs');
      if (existsSync(docsPath)) {
        return docsPath;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Finds the package root by looking for package.json.
 */
function findPackageRoot(startDir: string): string | null {
  let currentDir = startDir;

  while (currentDir !== dirname(currentDir)) {
    const packageJsonPath = join(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (pkg.name === '@dkmaker/ai-debug') {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Finds the node_modules installation root.
 */
function findNodeModuleRoot(): string | null {
  try {
    // This will be the path when installed via npm
    const resolved = require.resolve('@dkmaker/ai-debug/package.json');
    return dirname(resolved);
  } catch {
    return null;
  }
}

/**
 * Copies a directory recursively.
 */
function copyDirectory(source: string, target: string, force: boolean): void {
  if (existsSync(target) && !force) {
    throw new Error(`Target directory ${target} already exists. Use --force to overwrite.`);
  }

  // Ensure target directory exists
  mkdirSync(target, { recursive: true });

  // Copy recursively
  cpSync(source, target, {
    recursive: true,
    force: force,
  });
}
