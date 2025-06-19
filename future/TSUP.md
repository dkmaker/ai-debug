## Is tsup the Best Build Generator for Module/CommonJS TypeScript Packages?

**tsup** is widely regarded as one of the easiest and fastest tools for building TypeScript packages targeting both ESM (ECMAScript Modules) and CommonJS (CJS) outputs. It is a zero-config bundler powered by esbuild, focused on speed, simplicity, and modern workflows. Developers appreciate tsup for its ability to handle TypeScript compilation, tree shaking, minification, and multi-format output with minimal setup.

Key reasons why tsup is considered a top choice:
- **Zero-configuration setup:** Works out of the box for most projects, reducing build complexity.
- **Fast builds:** Leverages esbuild for rapid compilation and bundling.
- **Multi-format support:** Easily outputs both ESM and CJS modules, making it ideal for libraries targeting multiple environments.
- **Modern features:** Supports code splitting, source maps, and minification, all with native TypeScript support.
- **Plugin architecture:** Allows customization and extension for advanced use cases.

While there are alternatives like Rollup and Webpack, tsup is often preferred for TypeScript library development due to its speed and simplicity, especially when dual-publishing ESM and CJS modules.

## Can tsup Inject Versions or Other Constants at Build Time?

Yes, tsup can inject build-time variables—such as version numbers, commit hashes, or other constants—directly into your code as constants. This is typically achieved by embedding environment variables at build time.

**How to inject build-time variables with tsup:**
- **Via config file:** You can define environment variables in your `tsup.config.ts` using the `env` property.
- **Via CLI flags:** Pass variables directly using the `--env` flag.
- **Using .env files:** While native `.env` support is a feature request, you can manually load variables from a `.env` file using `dotenv` in your config.

**Example using dotenv for build-time injection:**
```typescript
import { defineConfig } from 'tsup'
import dotenv from 'dotenv'

export default defineConfig({
  entry: ['src/index.ts'],
  env: dotenv.config().parsed, // Loads variables from .env file
})
```
This approach allows you to inject any variable—such as your package version or a git commit hash—directly into your bundled code as a constant.

**Summary Table**

| Feature                    | tsup Support           |
|----------------------------|------------------------|
| ESM & CJS output           | Yes                    |
| Zero-config setup          | Yes                    |
| Fast builds (esbuild)      | Yes                    |
| Build-time constant inject | Yes (via env/config)   |
| .env file support          | Manual (dotenv)        |

## Conclusion

**tsup** is among the best build generators for TypeScript packages targeting both module and CommonJS formats, thanks to its speed, simplicity, and modern feature set. It also supports injecting build-time constants, such as version numbers, into your code using environment variables defined in your config, via CLI flags, or by integrating with dotenv for .env file support.
