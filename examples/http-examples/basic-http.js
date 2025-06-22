#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import axios from 'axios';
import chalk from 'chalk';

console.log(chalk.blue('🌐 Running Basic HTTP Examples'));

// Mock HTTP client for demonstration
class MockHttpClient {
  static async get(url, config = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    // Simulate different responses based on URL
    if (url.includes('/users')) {
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json', 'x-response-time': '45ms' },
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]
      };
    } else if (url.includes('/profile')) {
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { id: 123, name: 'Alice Johnson', role: 'admin', lastLogin: new Date() }
      };
    } else if (url.includes('/error')) {
      const error = new Error('Service Unavailable');
      error.response = { status: 503, statusText: 'Service Unavailable' };
      error.code = 'ECONNREFUSED';
      throw error;
    }
    
    return { status: 404, statusText: 'Not Found', data: { error: 'Resource not found' } };
  }

  static async post(url, data, config = {}) {
    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120));
    
    if (url.includes('/users')) {
      return {
        status: 201,
        statusText: 'Created',
        headers: { 'content-type': 'application/json', 'location': '/users/456' },
        data: { id: 456, ...data, createdAt: new Date() }
      };
    }
    
    return { status: 200, statusText: 'OK', data: { success: true } };
  }
}

async function basicGetRequest() {
  console.log(chalk.yellow('📥 Testing basic GET request...'));
  
  /*DEBUG:START*/
  const users = await debug.wrap('fetch_users_list', async () => {
    return await MockHttpClient.get('https://api.example.com/users');
  }, {
    template: 'http',
    context: {
      url: 'https://api.example.com/users',
      method: 'GET',
      headers: {
        'user-agent': 'AI-Debug-Example/1.0',
        'accept': 'application/json'
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Fetched users:'), users.data.length, 'users');
  return users;
}

async function basicPostRequest() {
  console.log(chalk.yellow('📤 Testing basic POST request...'));
  
  const newUser = {
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    role: 'user'
  };
  
  /*DEBUG:START*/
  const result = await debug.wrap('create_new_user', async () => {
    return await MockHttpClient.post('https://api.example.com/users', newUser);
  }, {
    template: 'http',
    context: {
      url: 'https://api.example.com/users',
      method: 'POST',
      body: newUser,
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer fake-jwt-token'
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Created user:'), result.data.id);
  return result;
}

async function cachedRequest() {
  console.log(chalk.yellow('🔄 Testing cached requests...'));
  
  // First request (cache miss)
  /*DEBUG:START*/
  const profile1 = await debug.wrap('fetch_user_profile', async () => {
    return await MockHttpClient.get('https://api.example.com/profile/123');
  }, {
    template: 'http',
    context: {
      url: 'https://api.example.com/profile/123',
      method: 'GET',
      headers: { 'accept': 'application/json' }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.blue('📊 First request (cache miss)'), profile1.data.name);
  
  // Second request (should be cache hit)
  /*DEBUG:START*/
  const profile2 = await debug.wrap('fetch_user_profile', async () => {
    return await MockHttpClient.get('https://api.example.com/profile/123');
  }, {
    template: 'http',
    context: {
      url: 'https://api.example.com/profile/123',
      method: 'GET',
      headers: { 'accept': 'application/json' }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.blue('📊 Second request (cache hit)'), profile2.data.name);
  return [profile1, profile2];
}

async function requestWithHeaders() {
  console.log(chalk.yellow('🔐 Testing request with authentication...'));
  
  /*DEBUG:START*/
  const secureData = await debug.wrap('fetch_secure_data', async () => {
    return await MockHttpClient.get('https://api.example.com/users', {
      headers: {
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'x-api-key': 'secret-api-key-12345',
        'user-agent': 'AI-Debug-Example/1.0',
        'accept': 'application/json',
        'x-request-id': 'req-' + Date.now()
      }
    });
  }, {
    template: 'http',
    context: {
      url: 'https://api.example.com/users',
      method: 'GET',
      headers: {
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'x-api-key': 'secret-api-key-12345',
        'user-agent': 'AI-Debug-Example/1.0',
        'accept': 'application/json',
        'x-request-id': 'req-' + Date.now()
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Secure request completed'), secureData.status);
  return secureData;
}

async function runBasicHttpExamples() {
  console.log(chalk.blue('🚀 Starting Basic HTTP Examples'));
  
  try {
    await basicGetRequest();
    await basicPostRequest();
    await cachedRequest();
    await requestWithHeaders();
    
    console.log(chalk.green('✅ All basic HTTP examples completed successfully!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for debug data'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error in basic HTTP examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicHttpExamples();
}