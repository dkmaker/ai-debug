#!/usr/bin/env tsx

/**
 * Build-time documentation generator.
 *
 * Generates comprehensive documentation from JSDoc comments during build time
 * and stores it in versioned directories for distribution with the package.
 *
 * This approach eliminates runtime parsing dependencies and ensures documentation
 * is always consistent with the package version.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ClaudeCommandGenerator } from './claude-command-generator.js';
import { JSDocExtractor } from './jsdoc-extractor.js';
import { MermaidGenerator } from './mermaid-generator.js';
import { MultiAudienceGenerator } from './multi-audience-generator.js';

interface BuildConfig {
  /** Package version from package.json */
  version: string;
  /** Package name from package.json */
  name: string;
  /** Output directory for versioned docs */
  outputDir: string;
  /** Whether to include diagrams */
  includeDiagrams: boolean;
  /** Whether to include examples */
  includeExamples: boolean;
  /** Whether to include workflows */
  includeWorkflows: boolean;
}

/**
 * Main build-time documentation generator.
 */
async function generateBuildTimeDocs(): Promise<void> {
  console.log('🔧 Starting build-time documentation generation...');

  // Read package.json for version info
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

  const config: BuildConfig = {
    version: packageJson.version,
    name: packageJson.name,
    outputDir: './docs',
    includeDiagrams: true,
    includeExamples: true,
    includeWorkflows: true,
  };

  console.log(`📦 Generating docs for ${config.name} v${config.version}`);

  // Create docs output directory (clean if exists)
  const docsDir = config.outputDir;
  if (existsSync(docsDir)) {
    console.log(`🧹 Cleaning existing docs directory`);
    rmSync(docsDir, { recursive: true, force: true });
  }
  ensureDirectoryExists(docsDir);

  // Extract JSDoc entries from source code
  console.log('📚 Extracting JSDoc documentation...');
  const extractor = new JSDocExtractor('./src');
  const entries = await extractor.extractAll();

  if (entries.length === 0) {
    console.warn('⚠️  No documented code found. Skipping documentation generation.');
    return;
  }

  console.log(`✅ Found ${entries.length} documented elements`);

  let totalFiles = 0;

  // Generate multi-audience documentation
  console.log('📖 Generating multi-audience documentation...');
  const multiGen = new MultiAudienceGenerator();

  // Generate internal docs with proper directory structure
  const internalResult = await multiGen.generate(entries, {
    type: 'internal',
    outputDir: join(docsDir, 'internal'),
    includeExamples: config.includeExamples,
    includeWorkflows: config.includeWorkflows,
    includeDeprecated: false,
    projectName: config.name,
    version: config.version,
  });
  totalFiles += internalResult.files.length;

  // Generate external docs with proper directory structure
  const externalResult = await multiGen.generate(entries, {
    type: 'external',
    outputDir: join(docsDir, 'external'),
    includeExamples: config.includeExamples,
    includeWorkflows: config.includeWorkflows,
    includeDeprecated: false,
    projectName: config.name,
    version: config.version,
  });
  totalFiles += externalResult.files.length;

  // Generate Claude commands
  console.log('🤖 Generating Claude command files...');
  const claudeGen = new ClaudeCommandGenerator();
  const claudeResult = await claudeGen.generateCommands(entries, {
    outputDir: join(docsDir, 'claude-commands'),
    projectName: config.name,
    version: config.version,
    includeDiagrams: config.includeDiagrams,
    includeExamples: config.includeExamples,
  });
  totalFiles += claudeResult.files.length;

  // Generate Mermaid diagrams
  if (config.includeDiagrams) {
    console.log('📊 Generating Mermaid diagrams...');
    const mermaidGen = new MermaidGenerator();
    const mermaidResult = await mermaidGen.generateDiagrams(entries, {
      outputDir: join(docsDir, 'diagrams'),
      diagramTypes: [
        'class-hierarchy',
        'workflow',
        'api-flow',
        'template-inheritance',
        'debug-flow',
        'cache-flow',
      ],
      includeTheme: true,
      maxNodes: 50,
      includeInternal: true,
    });
    totalFiles += mermaidResult.diagrams.length;
  }

  // Create version manifest
  const manifest = {
    version: config.version,
    packageName: config.name,
    generatedAt: new Date().toISOString(),
    totalFiles,
    totalEntries: entries.length,
    includedFeatures: {
      internal: true,
      external: true,
      claudeCommands: true,
      diagrams: config.includeDiagrams,
      examples: config.includeExamples,
      workflows: config.includeWorkflows,
    },
  };

  writeFileSync(join(docsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Final summary
  console.log('');
  console.log('🎉 Build-time documentation generation complete!');
  console.log(`📁 Output directory: ${docsDir}`);
  console.log(`📄 Total files generated: ${totalFiles}`);
  console.log(`📚 Source entries processed: ${entries.length}`);
}

/**
 * Ensures a directory exists, creating it if necessary.
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}


// Run the generator if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateBuildTimeDocs().catch((error) => {
    console.error('❌ Build-time documentation generation failed:');
    console.error(error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

export { generateBuildTimeDocs };
