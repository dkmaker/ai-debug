#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import chalk from 'chalk';

console.log(chalk.blue('📦 Running Database Batch Operations Examples'));

// Mock batch operation data
const newUsers = [
  { name: 'Emma Wilson', email: 'emma@example.com', role: 'user' },
  { name: 'Michael Chen', email: 'michael@example.com', role: 'user' },
  { name: 'Sarah Davis', email: 'sarah@example.com', role: 'moderator' },
  { name: 'David Kim', email: 'david@example.com', role: 'user' },
  { name: 'Lisa Anderson', email: 'lisa@example.com', role: 'admin' }
];

const orderUpdates = [
  { id: 101, status: 'shipped', tracking_number: 'TRK001' },
  { id: 102, status: 'completed', tracking_number: 'TRK002' },
  { id: 103, status: 'cancelled', tracking_number: null },
  { id: 104, status: 'processing', tracking_number: null }
];

// Mock Database Client for batch operations
class MockBatchDatabaseClient {
  static async execute(sql, params = []) {
    // Simulate processing time based on operation complexity
    const operationCount = Array.isArray(params[0]) ? params.length : 1;
    const baseDelay = 50;
    const batchDelay = operationCount * 10; // 10ms per item in batch
    
    await new Promise(resolve => setTimeout(resolve, baseDelay + batchDelay + Math.random() * 100));
    
    const upperSql = sql.trim().toUpperCase();
    
    if (upperSql.startsWith('INSERT')) {
      return this.handleBatchInsert(sql, params);
    } else if (upperSql.startsWith('UPDATE')) {
      return this.handleBatchUpdate(sql, params);
    } else if (upperSql.startsWith('DELETE')) {
      return this.handleBatchDelete(sql, params);
    } else if (upperSql.includes('ERROR')) {
      // Simulate constraint violation
      const error = new Error('Duplicate entry for key \'email\'');
      error.code = 'ER_DUP_ENTRY';
      error.sqlState = '23000';
      throw error;
    }
    
    return { affectedRows: 0, insertId: null };
  }
  
  static handleBatchInsert(sql, params) {
    const isBatch = Array.isArray(params[0]);
    const itemCount = isBatch ? params.length : 1;
    
    // Simulate auto-increment IDs
    const startId = 1000 + Math.floor(Math.random() * 100);
    const insertIds = Array.from({ length: itemCount }, (_, i) => startId + i);
    
    return {
      affectedRows: itemCount,
      insertId: isBatch ? insertIds : startId,
      fields: [{ name: 'insertId' }],
      rows: [],
      rowsExamined: 0
    };
  }
  
  static handleBatchUpdate(sql, params) {
    const isBatch = Array.isArray(params[0]);
    const itemCount = isBatch ? params.length : 1;
    
    // Simulate some updates failing (not found)
    const successfulUpdates = Math.max(1, itemCount - Math.floor(itemCount * 0.1));
    
    return {
      affectedRows: successfulUpdates,
      changedRows: successfulUpdates,
      fields: [],
      rows: [],
      rowsExamined: itemCount * 2 // Assuming index scan + update
    };
  }
  
  static handleBatchDelete(sql, params) {
    const isBatch = Array.isArray(params[0]);
    const itemCount = isBatch ? params.length : 1;
    
    // Simulate successful deletions
    const deletedRows = Math.max(0, itemCount - Math.floor(itemCount * 0.05));
    
    return {
      affectedRows: deletedRows,
      fields: [],
      rows: [],
      rowsExamined: itemCount * 3 // Assuming full table scan for complex WHERE
    };
  }
}

async function testSingleInsert() {
  console.log(chalk.yellow('➕ Testing single user insert...'));
  
  const newUser = { name: 'Single User', email: 'single@example.com', role: 'user' };
  
  /*DEBUG:START*/
  const result = await debug.wrap('single_user_insert', async () => {
    return await MockBatchDatabaseClient.execute(
      'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
      [newUser.name, newUser.email, newUser.role]
    );
  }, {
    template: 'database',
    context: {
      sql: 'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
      params: [newUser.name, newUser.email, newUser.role],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Single insert completed:'), `ID ${result.insertId}, affected ${result.affectedRows} row`);
  return result;
}

async function testBatchInsert() {
  console.log(chalk.yellow('📥 Testing batch user insert (5 users)...'));
  
  /*DEBUG:START*/
  const result = await debug.wrap('batch_user_insert', async () => {
    return await MockBatchDatabaseClient.execute(
      'INSERT INTO users (name, email, role) VALUES ?',
      [newUsers.map(user => [user.name, user.email, user.role])]
    );
  }, {
    template: 'database',
    context: {
      sql: 'INSERT INTO users (name, email, role) VALUES ?',
      params: [newUsers.map(user => [user.name, user.email, user.role])],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch insert completed:'), `${result.affectedRows} users inserted`);
  console.log(chalk.gray('   Insert IDs:'), Array.isArray(result.insertId) ? result.insertId.join(', ') : result.insertId);
  return result;
}

async function testPerformanceComparison() {
  console.log(chalk.yellow('⚡ Testing performance: Single vs Batch inserts...'));
  
  // Single insert performance test
  const singleInsertPromises = [];
  for (let i = 0; i < 3; i++) {
    /*DEBUG:START*/
    const promise = debug.wrap(`single_insert_perf_${i}`, async () => {
      return await MockBatchDatabaseClient.execute(
        'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
        [`Perf User ${i}`, `perf${i}@example.com`, 'user']
      );
    }, {
      template: 'database',
      context: {
        sql: 'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
        params: [`Perf User ${i}`, `perf${i}@example.com`, 'user'],
        database: 'production',
      }
    });
    /*DEBUG:END*/
    
    singleInsertPromises.push(promise);
  }
  
  const singleStartTime = Date.now();
  await Promise.all(singleInsertPromises);
  const singleTotalTime = Date.now() - singleStartTime;
  
  console.log(chalk.blue('📊 Single inserts (3 separate queries):'), `${singleTotalTime}ms total`);
  
  // Batch insert performance test
  const batchStartTime = Date.now();
  /*DEBUG:START*/
  const batchResult = await debug.wrap('batch_insert_perf', async () => {
    return await MockBatchDatabaseClient.execute(
      'INSERT INTO users (name, email, role) VALUES ?',
      [Array.from({ length: 3 }, (_, i) => [`Batch User ${i}`, `batch${i}@example.com`, 'user'])]
    );
  }, {
    template: 'database',
    context: {
      sql: 'INSERT INTO users (name, email, role) VALUES ?',
      params: [Array.from({ length: 3 }, (_, i) => [`Batch User ${i}`, `batch${i}@example.com`, 'user'])],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  const batchTotalTime = Date.now() - batchStartTime;
  
  console.log(chalk.blue('📊 Batch insert (1 query):'), `${batchTotalTime}ms total`);
  console.log(chalk.green('✅ Performance benefit:'), `${((singleTotalTime - batchTotalTime) / singleTotalTime * 100).toFixed(1)}% faster`);
  
  return { singleTotalTime, batchTotalTime, batchResult };
}

async function testBatchUpdate() {
  console.log(chalk.yellow('🔄 Testing batch order status updates...'));
  
  /*DEBUG:START*/
  const result = await debug.wrap('batch_order_update', async () => {
    // Simulate batch update with CASE statement
    const caseStatements = orderUpdates.map(order => 
      `WHEN id = ${order.id} THEN '${order.status}'`
    ).join(' ');
    
    const ids = orderUpdates.map(order => order.id).join(',');
    
    return await MockBatchDatabaseClient.execute(
      `UPDATE orders SET status = CASE ${caseStatements} END WHERE id IN (${ids})`,
      [orderUpdates]
    );
  }, {
    template: 'database',
    context: {
      sql: `UPDATE orders SET status = CASE ... END WHERE id IN (${orderUpdates.map(o => o.id).join(',')})`,
      params: orderUpdates,
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch update completed:'), `${result.affectedRows} orders updated`);
  console.log(chalk.gray('   Rows examined:'), result.rowsExamined);
  return result;
}

async function testBulkDelete() {
  console.log(chalk.yellow('🗑️  Testing bulk delete operations...'));
  
  const userIdsToDelete = [1001, 1002, 1003];
  
  /*DEBUG:START*/
  const result = await debug.wrap('bulk_user_delete', async () => {
    return await MockBatchDatabaseClient.execute(
      'DELETE FROM users WHERE id IN (?, ?, ?)',
      userIdsToDelete
    );
  }, {
    template: 'database',
    context: {
      sql: 'DELETE FROM users WHERE id IN (?, ?, ?)',
      params: userIdsToDelete,
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Bulk delete completed:'), `${result.affectedRows} users deleted`);
  console.log(chalk.gray('   Rows examined:'), result.rowsExamined);
  return result;
}

async function testBatchWithError() {
  console.log(chalk.yellow('❌ Testing batch operation with constraint violation...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('batch_insert_with_error', async () => {
      return await MockBatchDatabaseClient.execute(
        'INSERT INTO users (name, email, role) VALUES ? ERROR',
        [[['Duplicate User', 'existing@example.com', 'user']]]
      );
    }, {
      template: 'database',
      context: {
        sql: 'INSERT INTO users (name, email, role) VALUES ? ERROR',
        params: [[['Duplicate User', 'existing@example.com', 'user']]],
        database: 'production',
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('✅ Caught expected batch error:'), error.message);
    console.log(chalk.gray('   SQL State:'), error.sqlState);
    console.log(chalk.gray('   Error Code:'), error.code);
  }
}

async function testLargeDatasetBatch() {
  console.log(chalk.yellow('📊 Testing large dataset batch operations (1000 records)...'));
  
  // Generate large dataset
  const largeDataset = Array.from({ length: 1000 }, (_, i) => [
    `User ${i}`,
    `user${i}@batch.example.com`,
    i % 3 === 0 ? 'admin' : i % 2 === 0 ? 'moderator' : 'user'
  ]);
  
  /*DEBUG:START*/
  const result = await debug.wrap('large_batch_insert', async () => {
    return await MockBatchDatabaseClient.execute(
      'INSERT INTO users (name, email, role) VALUES ?',
      [largeDataset]
    );
  }, {
    template: 'database',
    context: {
      sql: 'INSERT INTO users (name, email, role) VALUES ?',
      params: [`[${largeDataset.length} records]`], // Truncated for debug data
      database: 'production',
      batch_size: largeDataset.length
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Large batch insert completed:'), `${result.affectedRows} users inserted`);
  console.log(chalk.gray('   Dataset size:'), largeDataset.length, 'records');
  return result;
}

async function runBatchOperationExamples() {
  console.log(chalk.blue('🚀 Starting Database Batch Operations Examples'));
  
  try {
    await testSingleInsert();
    await testBatchInsert();
    await testPerformanceComparison();
    await testBatchUpdate();
    await testBulkDelete();
    await testBatchWithError();
    await testLargeDatasetBatch();
    
    console.log(chalk.green('✅ All database batch operation examples completed successfully!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for batch operation debug data'));
    console.log(chalk.gray('📝 Debug data includes:'));
    console.log(chalk.gray('   - Batch operation parameters and row counts'));
    console.log(chalk.gray('   - Performance metrics for single vs batch operations'));
    console.log(chalk.gray('   - Insert IDs and affected row counts'));
    console.log(chalk.gray('   - Error handling for constraint violations'));
    console.log(chalk.gray('   - Large dataset processing metrics'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error in batch operation examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBatchOperationExamples();
}