// AI Debug wrapper for examples
let aiDebugInstance = null;

// Initialize on first import
(async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { AIDebug } = await import('@dkmaker/ai-debug');
      const config = await import('./config.json', { with: { type: 'json' } });
      const { resolve } = await import('node:path');
      const templatesPath = resolve('.ai-debug/templates');
      aiDebugInstance = new AIDebug(config.default, templatesPath);
      console.log('🔍 AI Debug initialized for examples');
    } catch (e) {
      console.warn('⚠️  Failed to initialize AI Debug:', e.message);
    }
  }
})();

// Simple wrapper - all logic is in the package
export const debug = {
  wrap: (action, fn, ...args) => aiDebugInstance?.wrap(action, fn, ...args) || fn(),
  raw: (action, fn, ...args) => aiDebugInstance?.raw(action, fn, ...args) || fn(),
  log: (level, message, data) => aiDebugInstance?.log(level, message, data)
};

// Removal patterns for production builds
export const REMOVAL_PATTERNS = {
  debugBlock: /\/\*DEBUG:START\*\/[\s\S]*?\/\*DEBUG:END\*\//g,
  inlineDebug: /\/\*DEBUG:START\*\/.*?\/\*DEBUG:END\*\//g
};
