#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import chalk from 'chalk';

console.log(chalk.blue('⚠️  Running HTTP Error Handling Examples'));

// Mock HTTP client that simulates various error scenarios
class ErrorHttpClient {
  static async simulateNetworkError() {
    await new Promise(resolve => setTimeout(resolve, 100));
    const error = new Error('Network Error: Connection refused');
    error.code = 'ECONNREFUSED';
    error.response = null;
    throw error;
  }

  static async simulateTimeoutError() {
    await new Promise(resolve => setTimeout(resolve, 150));
    const error = new Error('Request timeout');
    error.code = 'ETIMEDOUT';
    error.response = null;
    throw error;
  }

  static async simulate404Error() {
    await new Promise(resolve => setTimeout(resolve, 50));
    const error = new Error('Not Found');
    error.response = {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'application/json' },
      data: { error: 'Resource not found', code: 'NOT_FOUND' }
    };
    throw error;
  }

  static async simulate500Error() {
    await new Promise(resolve => setTimeout(resolve, 80));
    const error = new Error('Internal Server Error');
    error.response = {
      status: 500,
      statusText: 'Internal Server Error',
      headers: { 'content-type': 'application/json' },
      data: { error: 'Database connection failed', code: 'DB_ERROR', timestamp: new Date() }
    };
    throw error;
  }

  static async simulate401Error() {
    await new Promise(resolve => setTimeout(resolve, 30));
    const error = new Error('Unauthorized');
    error.response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'content-type': 'application/json', 'www-authenticate': 'Bearer' },
      data: { error: 'Invalid or expired token', code: 'UNAUTHORIZED' }
    };
    throw error;
  }

  static async simulate403Error() {
    await new Promise(resolve => setTimeout(resolve, 25));
    const error = new Error('Forbidden');
    error.response = {
      status: 403,
      statusText: 'Forbidden',
      headers: { 'content-type': 'application/json' },
      data: { error: 'Insufficient permissions', code: 'FORBIDDEN', requiredRole: 'admin' }
    };
    throw error;
  }

  static async simulateRateLimitError() {
    await new Promise(resolve => setTimeout(resolve, 10));
    const error = new Error('Too Many Requests');
    error.response = {
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 
        'content-type': 'application/json',
        'retry-after': '60',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': Date.now() + 60000
      },
      data: { error: 'Rate limit exceeded', retryAfter: 60 }
    };
    throw error;
  }

  static async simulateValidationError() {
    await new Promise(resolve => setTimeout(resolve, 40));
    const error = new Error('Bad Request');
    error.response = {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'content-type': 'application/json' },
      data: {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'age', message: 'Must be between 18 and 120' }
        ]
      }
    };
    throw error;
  }
}

async function handleNetworkError() {
  console.log(chalk.yellow('\\n🌐 Testing network connection error...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('network_error_request', async () => {
      return await ErrorHttpClient.simulateNetworkError();
    }, {
      template: 'http',
      context: {
        url: 'https://unreachable.example.com/api/data',
        method: 'GET',
        headers: { 'accept': 'application/json' },
        timeout: 5000
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('❌ Network error caught:'), error.code);
  }
}

async function handleTimeoutError() {
  console.log(chalk.yellow('\\n⏱️  Testing request timeout...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('timeout_request', async () => {
      return await ErrorHttpClient.simulateTimeoutError();
    }, {
      template: 'http',
      context: {
        url: 'https://slow.example.com/api/slow-endpoint',
        method: 'GET',
        headers: { 'accept': 'application/json' },
        timeout: 1000
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('❌ Timeout error caught:'), error.code);
  }
}

async function handle404Error() {
  console.log(chalk.yellow('\\n🔍 Testing 404 Not Found...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('not_found_request', async () => {
      return await ErrorHttpClient.simulate404Error();
    }, {
      template: 'http',
      context: {
        url: 'https://api.example.com/api/nonexistent-resource',
        method: 'GET',
        headers: { 'accept': 'application/json' }
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('❌ 404 error caught:'), error.response?.data?.code);
  }
}

async function handle500Error() {
  console.log(chalk.yellow('\\n💥 Testing 500 Internal Server Error...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('server_error_request', async () => {
      return await ErrorHttpClient.simulate500Error();
    }, {
      template: 'http',
      context: {
        url: 'https://api.example.com/api/broken-endpoint',
        method: 'GET',
        headers: { 'accept': 'application/json' }
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('❌ Server error caught:'), error.response?.data?.code);
  }
}

async function handleAuthenticationError() {
  console.log(chalk.yellow('\\n🔐 Testing 401 Unauthorized...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('unauthorized_request', async () => {
      return await ErrorHttpClient.simulate401Error();
    }, {
      template: 'http',
      context: {
        url: 'https://api.example.com/api/secure-data',
        method: 'GET',
        headers: {
          'authorization': 'Bearer expired-or-invalid-token',
          'accept': 'application/json'
        }
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('❌ Auth error caught:'), error.response?.data?.code);
  }
}

async function handleForbiddenError() {
  console.log(chalk.yellow('\\n🚫 Testing 403 Forbidden...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('forbidden_request', async () => {
      return await ErrorHttpClient.simulate403Error();
    }, {
      template: 'http',
      context: {
        url: 'https://api.example.com/api/admin/settings',
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-user-token',
          'accept': 'application/json'
        }
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('❌ Forbidden error caught:'), error.response?.data?.requiredRole);
  }
}

async function handleRateLimitError() {
  console.log(chalk.yellow('\\n🚦 Testing 429 Rate Limit Exceeded...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('rate_limit_request', async () => {
      return await ErrorHttpClient.simulateRateLimitError();
    }, {
      template: 'http',
      context: {
        url: 'https://api.example.com/api/high-frequency-endpoint',
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'accept': 'application/json'
        }
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('❌ Rate limit error caught:'), error.response?.data?.retryAfter + 's');
  }
}

async function handleValidationError() {
  console.log(chalk.yellow('\\n📝 Testing 400 Validation Error...'));
  
  const invalidData = {
    email: 'invalid-email',
    age: 150,
    name: ''
  };
  
  try {
    /*DEBUG:START*/
    await debug.wrap('validation_error_request', async () => {
      return await ErrorHttpClient.simulateValidationError();
    }, {
      template: 'http',
      context: {
        url: 'https://api.example.com/api/users',
        method: 'POST',
        body: invalidData,
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer valid-token'
        }
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('❌ Validation error caught:'), error.response?.data?.details?.length + ' fields');
  }
}

async function errorRecoveryPatterns() {
  console.log(chalk.yellow('\\n🔄 Testing error recovery patterns...'));
  
  // Retry pattern
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      /*DEBUG:START*/
      const result = await debug.wrap(`retry_request_attempt_${attempt}`, async () => {
        if (attempt < 3) {
          await ErrorHttpClient.simulate500Error();
        }
        return { status: 200, data: { success: true, attempt } };
      }, {
        template: 'http',
        context: {
          url: 'https://api.example.com/api/unreliable-endpoint',
          method: 'GET',
          headers: { 'accept': 'application/json' },
          attempt,
          maxRetries
        }
      });
      /*DEBUG:END*/
      
      console.log(chalk.green('✅ Request succeeded on attempt:'), attempt);
      return result;
    } catch (error) {
      if (attempt >= maxRetries) {
        console.log(chalk.red('❌ All retry attempts failed'));
        throw error;
      }
      console.log(chalk.yellow(`⏳ Retry attempt ${attempt} failed, retrying...`));
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
}

async function runErrorHandlingExamples() {
  console.log(chalk.blue('\\n🚀 Starting HTTP Error Handling Examples\\n'));
  
  try {
    // Network-level errors
    await handleNetworkError();
    await handleTimeoutError();
    
    // HTTP status errors
    await handle404Error();
    await handle500Error();
    
    // Authentication/Authorization errors
    await handleAuthenticationError();
    await handleForbiddenError();
    
    // Client errors
    await handleRateLimitError();
    await handleValidationError();
    
    // Recovery patterns
    await errorRecoveryPatterns();
    
    console.log(chalk.green('\\n✅ All error handling examples completed!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for error analysis data'));
    
  } catch (error) {
    console.error(chalk.red('❌ Unexpected error in error handling examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runErrorHandlingExamples();
}