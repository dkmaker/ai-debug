#!/usr/bin/env node

import { debug } from './.ai-debug/wrapper.js';

console.log('Testing timing issue...');

// Add a delay to ensure initialization
setTimeout(async () => {
  console.log('After delay, calling debug.wrap...');
  
  const result = await debug.wrap('test_timing', async () => {
    console.log('Inside wrapped function');
    return 'test result';
  }, {
    template: 'file',
    context: {
      operation: 'test',
      path: '/test/path'
    }
  });
  
  console.log('Result:', result);
  console.log('Check debug folder');
}, 1000);