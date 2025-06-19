#!/usr/bin/env node
/**
 * Modern documentation coverage analyzer with beautiful output.
 * Provides visual progress bars, colors, and clean formatting.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import chalk from 'chalk';

interface DocItem {
  type: 'class' | 'interface' | 'function' | 'method' | 'const';
  name: string;
  line: number;
  hasDoc: boolean;
}

interface FileResult {
  file: string;
  items: DocItem[];
  coverage: number;
}

interface CoverageReport {
  totalFiles: number;
  totalItems: number;
  documentedItems: number;
  overallCoverage: number;
  byType: Record<string, { total: number; documented: number }>;
  fileResults: FileResult[];
}

/**
 * Creates a visual progress bar.
 */
function createProgressBar(percentage: number, width = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  let color = chalk.green;
  if (percentage < 50) color = chalk.red;
  else if (percentage < 80) color = chalk.yellow;

  const bar = color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `${bar} ${color(`${percentage.toFixed(1)}%`)}`;
}

/**
 * Gets an icon for each item type.
 */
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    class: '🏛️ ',
    interface: '📋',
    function: '🔧',
    method: '⚙️ ',
    const: '📌',
  };
  return icons[type] || '📄';
}

/**
 * Analyzes a TypeScript file for documentation coverage.
 */
function analyzeFile(filePath: string): FileResult {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const items: DocItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip if line is inside a comment
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    // Check for exported items
    if (line.includes('export')) {
      // Check if there's a JSDoc comment above
      const hasDoc = checkForJSDoc(lines, i);

      // Match exported classes
      const classMatch = line.match(/export\s+(abstract\s+)?class\s+(\w+)/);
      if (classMatch) {
        items.push({
          type: 'class',
          name: classMatch[2],
          line: lineNum,
          hasDoc,
        });
        continue;
      }

      // Match exported interfaces
      const interfaceMatch = line.match(/export\s+interface\s+(\w+)/);
      if (interfaceMatch) {
        items.push({
          type: 'interface',
          name: interfaceMatch[1],
          line: lineNum,
          hasDoc,
        });
        continue;
      }

      // Match exported functions
      const functionMatch = line.match(/export\s+(async\s+)?function\s+(\w+)/);
      if (functionMatch) {
        items.push({
          type: 'function',
          name: functionMatch[2],
          line: lineNum,
          hasDoc,
        });
        continue;
      }

      // Match exported const functions/objects
      const constMatch = line.match(/export\s+const\s+(\w+)\s*[:=]/);
      if (constMatch) {
        // Check if it's a function
        if (line.includes('=>') || line.includes('function')) {
          items.push({
            type: 'function',
            name: constMatch[1],
            line: lineNum,
            hasDoc,
          });
        } else {
          items.push({
            type: 'const',
            name: constMatch[1],
            line: lineNum,
            hasDoc,
          });
        }
        continue;
      }
    }

    // Check for public class methods
    const methodMatch = line.match(/^\s*(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/);
    if (methodMatch && !line.includes('private') && !line.includes('protected')) {
      const methodName = methodMatch[2];
      const controlFlow = ['if', 'for', 'while', 'switch', 'catch', 'finally'];
      if (
        methodName !== 'constructor' &&
        !methodName.startsWith('_') &&
        !controlFlow.includes(methodName)
      ) {
        // Check if we're inside a class
        let isInClass = false;
        for (let j = i - 1; j >= 0 && j > i - 50; j--) {
          if (lines[j].match(/^\s*(export\s+)?(abstract\s+)?class\s+/)) {
            isInClass = true;
            break;
          }
        }

        if (isInClass) {
          const hasDoc = checkForJSDoc(lines, i);
          items.push({
            type: 'method',
            name: methodName,
            line: lineNum,
            hasDoc,
          });
        }
      }
    }
  }

  const documented = items.filter((item) => item.hasDoc).length;
  const coverage = items.length > 0 ? (documented / items.length) * 100 : 100;

  return {
    file: relative(process.cwd(), filePath),
    items,
    coverage,
  };
}

/**
 * Checks if there's a JSDoc comment above the current line.
 */
function checkForJSDoc(lines: string[], currentIndex: number): boolean {
  for (let i = currentIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();

    if (line === '*/') {
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].trim() === '/**') return true;
        if (lines[j].trim() === '/*') return false;
      }
      return false;
    }

    if (line && !line.startsWith('*') && !line.startsWith('//')) {
      return false;
    }
  }

  return false;
}

/**
 * Recursively finds all TypeScript files in a directory.
 */
function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'coverage', '.git'].includes(entry)) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts') && !entry.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Generates a documentation coverage report.
 */
export function generateCoverageReport(rootDir: string): CoverageReport {
  const files = findTypeScriptFiles(rootDir);
  const fileResults: FileResult[] = [];

  const byType: Record<string, { total: number; documented: number }> = {
    class: { total: 0, documented: 0 },
    interface: { total: 0, documented: 0 },
    function: { total: 0, documented: 0 },
    method: { total: 0, documented: 0 },
    const: { total: 0, documented: 0 },
  };

  let totalItems = 0;
  let documentedItems = 0;

  for (const file of files) {
    const result = analyzeFile(file);
    fileResults.push(result);

    for (const item of result.items) {
      totalItems++;
      byType[item.type].total++;

      if (item.hasDoc) {
        documentedItems++;
        byType[item.type].documented++;
      }
    }
  }

  return {
    totalFiles: files.length,
    totalItems,
    documentedItems,
    overallCoverage: totalItems > 0 ? (documentedItems / totalItems) * 100 : 100,
    byType,
    fileResults,
  };
}

/**
 * Formats the report with beautiful output.
 */
export function formatReport(report: CoverageReport): void {
  console.clear();

  // Header
  console.log(chalk.bold.white('\n📚 Documentation Coverage Report'));
  console.log(chalk.gray('\n════════════════════════════════════════════════════════════'));

  // Overall coverage with big visual
  console.log(chalk.bold('\nOverall Coverage'));
  console.log(createProgressBar(report.overallCoverage, 40));

  // Summary stats
  console.log('');
  console.log(chalk.bold('\n📊 Summary\n'));

  const stats = [
    ['Files analyzed', report.totalFiles],
    ['Total items', report.totalItems],
    ['Documented', chalk.green(report.documentedItems)],
    ['Missing', chalk.red(report.totalItems - report.documentedItems)],
  ];

  const maxLabel = Math.max(...stats.map((s) => s[0].toString().length));
  stats.forEach(([label, value]) => {
    console.log(`  ${label.toString().padEnd(maxLabel + 2)} ${value}`);
  });

  // Coverage by type
  console.log('');
  console.log(chalk.bold('\n📈 Coverage by Type\n'));

  Object.entries(report.byType).forEach(([type, stats]) => {
    const coverage = stats.total > 0 ? (stats.documented / stats.total) * 100 : 100;
    const icon = getTypeIcon(type);
    const typeLabel = `${icon} ${type.padEnd(10)}`;
    const statsText = chalk.dim(`${stats.documented}/${stats.total}`).padStart(7);

    console.log(`  ${typeLabel} ${statsText}  ${createProgressBar(coverage, 20)}`);
  });

  // Files with missing documentation
  const filesWithMissing = report.fileResults
    .filter((r) => r.items.some((item) => !item.hasDoc))
    .sort((a, b) => a.coverage - b.coverage);

  if (filesWithMissing.length > 0) {
    console.log('');
    console.log(chalk.bold('\n🔍 Files with Missing Documentation\n'));

    // Group by directory
    const byDir: Record<string, FileResult[]> = {};
    filesWithMissing.forEach((file) => {
      const dir = file.file.split('/').slice(0, -1).join('/') || '.';
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(file);
    });

    Object.entries(byDir).forEach(([dir, files]) => {
      console.log(chalk.dim(`\n  ${dir}/`));

      files.forEach((file) => {
        const fileName = file.file.split('/').pop() ?? '';
        const missing = file.items.filter((item) => !item.hasDoc);

        console.log(
          `    ${chalk.cyan(fileName.padEnd(25))} ${createProgressBar(file.coverage, 15)}`,
        );

        // Group missing items by type
        const byType: Record<string, DocItem[]> = {};
        missing.forEach((item) => {
          if (!byType[item.type]) byType[item.type] = [];
          byType[item.type].push(item);
        });

        Object.entries(byType).forEach(([type, items]) => {
          const icon = getTypeIcon(type);
          const names = items.map((i) => `${i.name}:${i.line}`).join(', ');
          console.log(chalk.dim(`      ${icon}  ${names}`));
        });
      });
    });
  }

  // Footer
  console.log('');

  // Threshold check
  const threshold = 80;
  if (report.overallCoverage < threshold) {
    console.log(
      chalk.red.bold(
        `\n❌ Coverage (${report.overallCoverage.toFixed(1)}%) is below threshold (${threshold}%)\n`,
      ),
    );
  } else {
    console.log(
      chalk.green.bold(
        `\n✅ Coverage (${report.overallCoverage.toFixed(1)}%) meets threshold (${threshold}%)\n`,
      ),
    );
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args[0] || './src';

  const report = generateCoverageReport(dir);
  formatReport(report);

  if (report.overallCoverage < 80) {
    process.exit(1);
  }
}
