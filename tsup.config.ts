import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Dynamically get all dependencies and devDependencies
// This ensures we don't bundle any npm packages - they'll be resolved from node_modules
// Benefits:
// - No need to manually maintain the external list
// - Smaller bundle size (only our code is bundled)
// - Faster builds
// - Respects the user's installed versions
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: true,

  // Inject version at build time
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },

  // Ensure proper extensions
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    };
  },

  // Don't bundle any dependencies - they'll be resolved from node_modules
  external,

  // Minify for production
  minify: false, // Keep readable for debugging tools

  // Target Node.js 22
  target: 'node22',

  // Post-build hook to add shebang to CLI files
  onSuccess: async () => {
    // Add shebang to ESM CLI file
    const cliPath = join('dist', 'cli', 'index.js');
    const content = readFileSync(cliPath, 'utf-8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
      chmodSync(cliPath, 0o755);
    }
  },
});
