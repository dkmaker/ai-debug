#!/usr/bin/env node

import { debug } from './.ai-debug/wrapper.js';

console.log('Starting simple debug test...');

// Simple test to see if our debug logging works
const result = await debug.wrap('test_action', async () => {
  console.log('Inside wrapped function');
  return 'test result';
}, {
  template: 'file',
  context: {
    operation: 'test',
    path: '/test/path'
  }
});

console.log('Test completed, result:', result);
console.log('Check debug folder for entries');