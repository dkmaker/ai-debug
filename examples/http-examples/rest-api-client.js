#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import chalk from 'chalk';

console.log(chalk.blue('🔗 Running REST API Client Examples'));

// Mock REST API responses
const mockApiResponses = {
  'GET:/api/v1/products': {
    status: 200,
    data: [
      { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', inStock: true },
      { id: 2, name: 'Phone', price: 699.99, category: 'Electronics', inStock: false },
      { id: 3, name: 'Book', price: 29.99, category: 'Education', inStock: true }
    ],
    pagination: { total: 3, page: 1, limit: 10 }
  },
  'GET:/api/v1/products/1': {
    status: 200,
    data: { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', inStock: true, description: 'High-performance laptop' }
  },
  'POST:/api/v1/products': {
    status: 201,
    data: { id: 4, name: 'Tablet', price: 399.99, category: 'Electronics', inStock: true, createdAt: new Date() }
  },
  'PUT:/api/v1/products/1': {
    status: 200,
    data: { id: 1, name: 'Gaming Laptop', price: 1299.99, category: 'Electronics', inStock: true, updatedAt: new Date() }
  },
  'DELETE:/api/v1/products/2': {
    status: 204,
    data: null
  }
};

// Mock REST API Client
class RestApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.requestCount = 0;
  }

  async request(method, endpoint, data = null, options = {}) {
    this.requestCount++;
    
    // Simulate network delay based on request complexity
    const delay = method === 'GET' ? 30 + Math.random() * 50 : 50 + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const key = `${method}:${endpoint}`;
    const mockResponse = mockApiResponses[key];
    
    if (!mockResponse) {
      const error = new Error(`Not Found: ${endpoint}`);
      error.response = { status: 404, statusText: 'Not Found' };
      throw error;
    }
    
    // Simulate occasional server errors
    if (Math.random() < 0.05) { // 5% chance of server error
      const error = new Error('Internal Server Error');
      error.response = { status: 500, statusText: 'Internal Server Error' };
      throw error;
    }
    
    return {
      ...mockResponse,
      headers: {
        'content-type': 'application/json',
        'x-response-time': `${Math.round(delay)}ms`,
        'x-request-id': `req-${this.requestCount}-${Date.now()}`,
        'x-rate-limit-remaining': 100 - this.requestCount
      }
    };
  }

  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }
}

const apiClient = new RestApiClient('https://api.shop.example.com', 'api-key-12345');

async function fetchProductList() {
  console.log(chalk.yellow('\\n📋 Fetching product list...'));
  
  /*DEBUG:START*/
  const response = await debug.wrap('fetch_products', async () => {
    return await apiClient.get('/api/v1/products');
  }, {
    template: 'http',
    context: {
      url: 'https://api.shop.example.com/api/v1/products',
      method: 'GET',
      headers: {
        'authorization': `Bearer ${apiClient.apiKey}`,
        'accept': 'application/json',
        'user-agent': 'RestClient/1.0'
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Products fetched:'), response.data.length);
  console.log(chalk.blue('📊 Total available:'), response.pagination.total);
  return response;
}

async function fetchSingleProduct(productId) {
  console.log(chalk.yellow(`\\n🔍 Fetching product ${productId}...`));
  
  /*DEBUG:START*/
  const response = await debug.wrap('fetch_product_details', async () => {
    return await apiClient.get(`/api/v1/products/${productId}`);
  }, {
    template: 'http',
    context: {
      url: `https://api.shop.example.com/api/v1/products/${productId}`,
      method: 'GET',
      headers: {
        'authorization': `Bearer ${apiClient.apiKey}`,
        'accept': 'application/json'
      },
      productId
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Product details:'), response.data.name, '-', `$${response.data.price}`);
  return response;
}

async function createProduct() {
  console.log(chalk.yellow('\\n➕ Creating new product...'));
  
  const newProduct = {
    name: 'Smart Watch',
    price: 299.99,
    category: 'Electronics',
    description: 'Advanced fitness tracking smartwatch'
  };
  
  /*DEBUG:START*/
  const response = await debug.wrap('create_product', async () => {
    return await apiClient.post('/api/v1/products', newProduct);
  }, {
    template: 'http',
    context: {
      url: 'https://api.shop.example.com/api/v1/products',
      method: 'POST',
      body: newProduct,
      headers: {
        'authorization': `Bearer ${apiClient.apiKey}`,
        'content-type': 'application/json'
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Product created with ID:'), response.data.id);
  return response;
}

async function updateProduct(productId) {
  console.log(chalk.yellow(`\\n✏️  Updating product ${productId}...`));
  
  const updateData = {
    name: 'Gaming Laptop Pro',
    price: 1499.99,
    description: 'Ultimate gaming performance laptop'
  };
  
  /*DEBUG:START*/
  const response = await debug.wrap('update_product', async () => {
    return await apiClient.put(`/api/v1/products/${productId}`, updateData);
  }, {
    template: 'http',
    context: {
      url: `https://api.shop.example.com/api/v1/products/${productId}`,
      method: 'PUT',
      body: updateData,
      headers: {
        'authorization': `Bearer ${apiClient.apiKey}`,
        'content-type': 'application/json'
      },
      productId
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Product updated:'), response.data.name);
  return response;
}

async function deleteProduct(productId) {
  console.log(chalk.yellow(`\\n🗑️  Deleting product ${productId}...`));
  
  /*DEBUG:START*/
  const response = await debug.wrap('delete_product', async () => {
    return await apiClient.delete(`/api/v1/products/${productId}`);
  }, {
    template: 'http',
    context: {
      url: `https://api.shop.example.com/api/v1/products/${productId}`,
      method: 'DELETE',
      headers: {
        'authorization': `Bearer ${apiClient.apiKey}`
      },
      productId
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Product deleted successfully'));
  return response;
}

async function batchRequests() {
  console.log(chalk.yellow('\\n📦 Running batch requests...'));
  
  const productIds = [1, 2, 3];
  const promises = productIds.map(id => {
    return debug.wrap(`fetch_product_${id}`, async () => {
      return await apiClient.get(`/api/v1/products/${id}`);
    }, {
      template: 'http',
      context: {
        url: `https://api.shop.example.com/api/v1/products/${id}`,
        method: 'GET',
        headers: { 'authorization': `Bearer ${apiClient.apiKey}` },
        batchOperation: true,
        productId: id
      }
    });
  });
  
  /*DEBUG:START*/
  const results = await debug.wrap('batch_fetch_products', async () => {
    return await Promise.all(promises);
  }, {
    template: 'business',
    context: {
      operation: 'batch_fetch',
      entity: 'products',
      input: { productIds },
      metadata: { batchSize: productIds.length }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch requests completed:'), results.length, 'products');
  return results;
}

async function runRestApiExamples() {
  console.log(chalk.blue('\\n🚀 Starting REST API Client Examples\\n'));
  
  try {
    // CRUD operations
    await fetchProductList();
    await fetchSingleProduct(1);
    await createProduct();
    await updateProduct(1);
    await deleteProduct(2);
    
    // Advanced scenarios
    await batchRequests();
    
    console.log(chalk.green('\\n✅ All REST API examples completed successfully!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for detailed request/response data'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error in REST API examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRestApiExamples();
}