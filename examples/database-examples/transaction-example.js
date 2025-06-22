#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import chalk from 'chalk';

console.log(chalk.blue('🔄 Running Database Transaction Examples'));

// Mock transaction state
let mockTransactionCounter = 1;
const activeTransactions = new Map();

// Mock Database Client with transaction support
class MockTransactionDatabaseClient {
  static async beginTransaction() {
    const transactionId = `txn_${mockTransactionCounter++}`;
    
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
    
    activeTransactions.set(transactionId, {
      id: transactionId,
      startTime: Date.now(),
      operations: [],
      status: 'active'
    });
    
    console.log(chalk.gray(`   📝 Transaction ${transactionId} started`));
    return transactionId;
  }
  
  static async commit(transactionId) {
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
    
    const transaction = activeTransactions.get(transactionId);
    if (transaction) {
      transaction.status = 'committed';
      transaction.endTime = Date.now();
      console.log(chalk.gray(`   ✅ Transaction ${transactionId} committed (${transaction.operations.length} operations)`));
    }
    
    return { transactionId, status: 'committed' };
  }
  
  static async rollback(transactionId) {
    await new Promise(resolve => setTimeout(resolve, 25 + Math.random() * 40));
    
    const transaction = activeTransactions.get(transactionId);
    if (transaction) {
      transaction.status = 'rolled_back';
      transaction.endTime = Date.now();
      console.log(chalk.gray(`   🔄 Transaction ${transactionId} rolled back (${transaction.operations.length} operations undone)`));
    }
    
    return { transactionId, status: 'rolled_back' };
  }
  
  static async executeInTransaction(transactionId, sql, params = []) {
    const baseDelay = 40;
    const complexityDelay = sql.includes('UPDATE') ? 30 : sql.includes('INSERT') ? 20 : 10;
    await new Promise(resolve => setTimeout(resolve, baseDelay + complexityDelay + Math.random() * 60));
    
    const transaction = activeTransactions.get(transactionId);
    if (!transaction) {
      const error = new Error('Transaction not found or already closed');
      error.code = 'ER_NO_TRANSACTION';
      error.sqlState = 'HY000';
      throw error;
    }
    
    if (transaction.status !== 'active') {
      const error = new Error('Transaction is not active');
      error.code = 'ER_INACTIVE_TRANSACTION';
      error.sqlState = 'HY000';
      throw error;
    }
    
    // Record operation in transaction
    transaction.operations.push({
      sql,
      params,
      timestamp: Date.now()
    });
    
    const upperSql = sql.trim().toUpperCase();
    
    if (upperSql.includes('DEADLOCK_ERROR')) {
      const error = new Error('Deadlock found when trying to get lock; try restarting transaction');
      error.code = 'ER_LOCK_DEADLOCK';
      error.sqlState = '40001';
      throw error;
    }
    
    if (upperSql.includes('CONSTRAINT_ERROR')) {
      const error = new Error('Cannot add or update a child row: a foreign key constraint fails');
      error.code = 'ER_ROW_IS_REFERENCED_2';
      error.sqlState = '23000';
      throw error;
    }
    
    if (upperSql.startsWith('UPDATE')) {
      return {
        affectedRows: Math.floor(Math.random() * 5) + 1,
        changedRows: Math.floor(Math.random() * 5) + 1,
        rowsExamined: Math.floor(Math.random() * 20) + 5,
        transactionId
      };
    } else if (upperSql.startsWith('INSERT')) {
      return {
        affectedRows: 1,
        insertId: 2000 + Math.floor(Math.random() * 100),
        transactionId
      };
    } else if (upperSql.startsWith('DELETE')) {
      return {
        affectedRows: Math.floor(Math.random() * 3) + 1,
        rowsExamined: Math.floor(Math.random() * 10) + 3,
        transactionId
      };
    }
    
    return { affectedRows: 0, transactionId };
  }
}

async function testSimpleTransaction() {
  console.log(chalk.yellow('💰 Testing simple money transfer transaction...'));
  
  let transactionId;
  
  try {
    // Begin transaction
    /*DEBUG:START*/
    transactionId = await debug.wrap('begin_money_transfer', async () => {
      return await MockTransactionDatabaseClient.beginTransaction();
    }, {
      template: 'database',
      context: {
        sql: 'BEGIN TRANSACTION',
        params: [],
        database: 'production',
        operation: 'begin_transaction'
      }
    });
    /*DEBUG:END*/
    
    // Debit from source account
    /*DEBUG:START*/
    const debitResult = await debug.wrap('debit_source_account', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        transactionId,
        'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?',
        [100.00, 'acc_123', 100.00]
      );
    }, {
      template: 'database',
      context: {
        sql: 'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?',
        params: [100.00, 'acc_123', 100.00],
        database: 'production',
        transaction: transactionId
      }
    });
    /*DEBUG:END*/
    
    // Credit to destination account
    /*DEBUG:START*/
    const creditResult = await debug.wrap('credit_destination_account', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        transactionId,
        'UPDATE accounts SET balance = balance + ? WHERE id = ?',
        [100.00, 'acc_456']
      );
    }, {
      template: 'database',
      context: {
        sql: 'UPDATE accounts SET balance = balance + ? WHERE id = ?',
        params: [100.00, 'acc_456'],
        database: 'production',
        transaction: transactionId
      }
    });
    /*DEBUG:END*/
    
    // Create transfer record
    /*DEBUG:START*/
    const transferResult = await debug.wrap('create_transfer_record', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        transactionId,
        'INSERT INTO transfers (from_account, to_account, amount, status) VALUES (?, ?, ?, ?)',
        ['acc_123', 'acc_456', 100.00, 'completed']
      );
    }, {
      template: 'database',
      context: {
        sql: 'INSERT INTO transfers (from_account, to_account, amount, status) VALUES (?, ?, ?, ?)',
        params: ['acc_123', 'acc_456', 100.00, 'completed'],
        database: 'production',
        transaction: transactionId
      }
    });
    /*DEBUG:END*/
    
    // Commit transaction
    /*DEBUG:START*/
    const commitResult = await debug.wrap('commit_money_transfer', async () => {
      return await MockTransactionDatabaseClient.commit(transactionId);
    }, {
      template: 'database',
      context: {
        sql: 'COMMIT',
        params: [],
        database: 'production',
        transaction: transactionId,
        operation: 'commit'
      }
    });
    /*DEBUG:END*/
    
    console.log(chalk.green('✅ Money transfer completed successfully'));
    console.log(chalk.gray('   Debit affected:'), debitResult.affectedRows, 'accounts');
    console.log(chalk.gray('   Credit affected:'), creditResult.affectedRows, 'accounts');
    console.log(chalk.gray('   Transfer ID:'), transferResult.insertId);
    
  } catch (error) {
    if (transactionId) {
      /*DEBUG:START*/
      await debug.wrap('rollback_money_transfer', async () => {
        return await MockTransactionDatabaseClient.rollback(transactionId);
      }, {
        template: 'database',
        context: {
          sql: 'ROLLBACK',
          params: [],
          database: 'production',
          transaction: transactionId,
          operation: 'rollback',
          error: error.message
        }
      });
      /*DEBUG:END*/
    }
    
    console.error(chalk.red('❌ Transaction failed:'), error.message);
    throw error;
  }
}

async function testTransactionRollback() {
  console.log(chalk.yellow('🔄 Testing transaction rollback on constraint violation...'));
  
  let transactionId;
  
  try {
    // Begin transaction
    /*DEBUG:START*/
    transactionId = await debug.wrap('begin_user_creation', async () => {
      return await MockTransactionDatabaseClient.beginTransaction();
    }, {
      template: 'database',
      context: {
        sql: 'BEGIN TRANSACTION',
        params: [],
        database: 'production',
        operation: 'begin_transaction'
      }
    });
    /*DEBUG:END*/
    
    // Create user
    /*DEBUG:START*/
    const userResult = await debug.wrap('create_user_in_transaction', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        transactionId,
        'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
        ['Transaction User', 'txn@example.com', 'user']
      );
    }, {
      template: 'database',
      context: {
        sql: 'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
        params: ['Transaction User', 'txn@example.com', 'user'],
        database: 'production',
        transaction: transactionId
      }
    });
    /*DEBUG:END*/
    
    // Create user profile (this will fail with constraint error)
    /*DEBUG:START*/
    await debug.wrap('create_user_profile_constraint_error', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        transactionId,
        'INSERT INTO user_profiles (user_id, bio) VALUES (?, ?) CONSTRAINT_ERROR',
        [userResult.insertId, 'User biography']
      );
    }, {
      template: 'database',
      context: {
        sql: 'INSERT INTO user_profiles (user_id, bio) VALUES (?, ?) CONSTRAINT_ERROR',
        params: [userResult.insertId, 'User biography'],
        database: 'production',
        transaction: transactionId
      }
    });
    /*DEBUG:END*/
    
  } catch (error) {
    console.log(chalk.red('✅ Caught expected constraint error:'), error.message);
    console.log(chalk.gray('   SQL State:'), error.sqlState);
    console.log(chalk.gray('   Error Code:'), error.code);
    
    // Rollback transaction
    /*DEBUG:START*/
    const rollbackResult = await debug.wrap('rollback_failed_user_creation', async () => {
      return await MockTransactionDatabaseClient.rollback(transactionId);
    }, {
      template: 'database',
      context: {
        sql: 'ROLLBACK',
        params: [],
        database: 'production',
        transaction: transactionId,
        operation: 'rollback',
        error: error.message
      }
    });
    /*DEBUG:END*/
    
    console.log(chalk.green('✅ Transaction properly rolled back'));
  }
}

async function testDeadlockHandling() {
  console.log(chalk.yellow('🔒 Testing deadlock detection and handling...'));
  
  let transactionId1, transactionId2;
  
  try {
    // Start two concurrent transactions
    /*DEBUG:START*/
    transactionId1 = await debug.wrap('begin_deadlock_transaction_1', async () => {
      return await MockTransactionDatabaseClient.beginTransaction();
    }, {
      template: 'database',
      context: {
        sql: 'BEGIN TRANSACTION',
        params: [],
        database: 'production',
        operation: 'begin_transaction'
      }
    });
    /*DEBUG:END*/
    
    /*DEBUG:START*/
    transactionId2 = await debug.wrap('begin_deadlock_transaction_2', async () => {
      return await MockTransactionDatabaseClient.beginTransaction();
    }, {
      template: 'database',
      context: {
        sql: 'BEGIN TRANSACTION',
        params: [],
        database: 'production',
        operation: 'begin_transaction'
      }
    });
    /*DEBUG:END*/
    
    // Transaction 1: Lock resource A
    /*DEBUG:START*/
    await debug.wrap('txn1_lock_resource_a', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        transactionId1,
        'UPDATE resource_table SET status = ? WHERE id = ?',
        ['locked', 'resource_a']
      );
    }, {
      template: 'database',
      context: {
        sql: 'UPDATE resource_table SET status = ? WHERE id = ?',
        params: ['locked', 'resource_a'],
        database: 'production',
        transaction: transactionId1
      }
    });
    /*DEBUG:END*/
    
    // Transaction 2: Lock resource B
    /*DEBUG:START*/
    await debug.wrap('txn2_lock_resource_b', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        transactionId2,
        'UPDATE resource_table SET status = ? WHERE id = ?',
        ['locked', 'resource_b']
      );
    }, {
      template: 'database',
      context: {
        sql: 'UPDATE resource_table SET status = ? WHERE id = ?',
        params: ['locked', 'resource_b'],
        database: 'production',
        transaction: transactionId2
      }
    });
    /*DEBUG:END*/
    
    // Transaction 1: Try to lock resource B (will cause deadlock)
    /*DEBUG:START*/
    await debug.wrap('txn1_deadlock_attempt', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        transactionId1,
        'UPDATE resource_table SET status = ? WHERE id = ? DEADLOCK_ERROR',
        ['locked', 'resource_b']
      );
    }, {
      template: 'database',
      context: {
        sql: 'UPDATE resource_table SET status = ? WHERE id = ? DEADLOCK_ERROR',
        params: ['locked', 'resource_b'],
        database: 'production',
        transaction: transactionId1
      }
    });
    /*DEBUG:END*/
    
  } catch (error) {
    console.log(chalk.red('✅ Caught expected deadlock error:'), error.message);
    console.log(chalk.gray('   SQL State:'), error.sqlState);
    console.log(chalk.gray('   Error Code:'), error.code);
    
    // Rollback both transactions
    if (transactionId1) {
      /*DEBUG:START*/
      await debug.wrap('rollback_deadlock_txn1', async () => {
        return await MockTransactionDatabaseClient.rollback(transactionId1);
      }, {
        template: 'database',
        context: {
          sql: 'ROLLBACK',
          params: [],
          database: 'production',
          transaction: transactionId1,
          operation: 'rollback',
          error: 'deadlock'
        }
      });
      /*DEBUG:END*/
    }
    
    if (transactionId2) {
      /*DEBUG:START*/
      await debug.wrap('rollback_deadlock_txn2', async () => {
        return await MockTransactionDatabaseClient.rollback(transactionId2);
      }, {
        template: 'database',
        context: {
          sql: 'ROLLBACK',
          params: [],
          database: 'production',
          transaction: transactionId2,
          operation: 'rollback',
          error: 'deadlock'
        }
      });
      /*DEBUG:END*/
    }
    
    console.log(chalk.green('✅ Deadlock handled properly, both transactions rolled back'));
  }
}

async function testNestedTransactions() {
  console.log(chalk.yellow('🔄 Testing nested transaction pattern (savepoints simulation)...'));
  
  let mainTransactionId;
  
  try {
    // Begin main transaction
    /*DEBUG:START*/
    mainTransactionId = await debug.wrap('begin_main_transaction', async () => {
      return await MockTransactionDatabaseClient.beginTransaction();
    }, {
      template: 'database',
      context: {
        sql: 'BEGIN TRANSACTION',
        params: [],
        database: 'production',
        operation: 'begin_transaction',
        transaction_type: 'main'
      }
    });
    /*DEBUG:END*/
    
    // Create order
    /*DEBUG:START*/
    const orderResult = await debug.wrap('create_order_main_txn', async () => {
      return await MockTransactionDatabaseClient.executeInTransaction(
        mainTransactionId,
        'INSERT INTO orders (customer_id, total, status) VALUES (?, ?, ?)',
        [1001, 250.00, 'pending']
      );
    }, {
      template: 'database',
      context: {
        sql: 'INSERT INTO orders (customer_id, total, status) VALUES (?, ?, ?)',
        params: [1001, 250.00, 'pending'],
        database: 'production',
        transaction: mainTransactionId
      }
    });
    /*DEBUG:END*/
    
    // Simulate nested transaction for order items
    /*DEBUG:START*/
    const nestedTransactionId = await debug.wrap('begin_nested_transaction', async () => {
      return await MockTransactionDatabaseClient.beginTransaction();
    }, {
      template: 'database',
      context: {
        sql: 'SAVEPOINT order_items',
        params: [],
        database: 'production',
        operation: 'savepoint',
        parent_transaction: mainTransactionId
      }
    });
    /*DEBUG:END*/
    
    try {
      // Add order items
      /*DEBUG:START*/
      const item1Result = await debug.wrap('add_order_item_1', async () => {
        return await MockTransactionDatabaseClient.executeInTransaction(
          nestedTransactionId,
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderResult.insertId, 'prod_123', 2, 125.00]
        );
      }, {
        template: 'database',
        context: {
          sql: 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          params: [orderResult.insertId, 'prod_123', 2, 125.00],
          database: 'production',
          transaction: nestedTransactionId,
          parent_transaction: mainTransactionId
        }
      });
      /*DEBUG:END*/
      
      /*DEBUG:START*/
      const item2Result = await debug.wrap('add_order_item_2', async () => {
        return await MockTransactionDatabaseClient.executeInTransaction(
          nestedTransactionId,
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderResult.insertId, 'prod_456', 1, 125.00]
        );
      }, {
        template: 'database',
        context: {
          sql: 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          params: [orderResult.insertId, 'prod_456', 1, 125.00],
          database: 'production',
          transaction: nestedTransactionId,
          parent_transaction: mainTransactionId
        }
      });
      /*DEBUG:END*/
      
      // Commit nested transaction (release savepoint)
      /*DEBUG:START*/
      await debug.wrap('commit_nested_transaction', async () => {
        return await MockTransactionDatabaseClient.commit(nestedTransactionId);
      }, {
        template: 'database',
        context: {
          sql: 'RELEASE SAVEPOINT order_items',
          params: [],
          database: 'production',
          operation: 'release_savepoint',
          parent_transaction: mainTransactionId
        }
      });
      /*DEBUG:END*/
      
    } catch (nestedError) {
      // Rollback to savepoint
      /*DEBUG:START*/
      await debug.wrap('rollback_to_savepoint', async () => {
        return await MockTransactionDatabaseClient.rollback(nestedTransactionId);
      }, {
        template: 'database',
        context: {
          sql: 'ROLLBACK TO SAVEPOINT order_items',
          params: [],
          database: 'production',
          operation: 'rollback_to_savepoint',
          parent_transaction: mainTransactionId,
          error: nestedError.message
        }
      });
      /*DEBUG:END*/
      
      console.log(chalk.yellow('⚠️  Nested transaction rolled back, continuing with main transaction'));
    }
    
    // Commit main transaction
    /*DEBUG:START*/
    const commitResult = await debug.wrap('commit_main_transaction', async () => {
      return await MockTransactionDatabaseClient.commit(mainTransactionId);
    }, {
      template: 'database',
      context: {
        sql: 'COMMIT',
        params: [],
        database: 'production',
        transaction: mainTransactionId,
        operation: 'commit'
      }
    });
    /*DEBUG:END*/
    
    console.log(chalk.green('✅ Nested transaction pattern completed successfully'));
    console.log(chalk.gray('   Order ID:'), orderResult.insertId);
    
  } catch (error) {
    if (mainTransactionId) {
      /*DEBUG:START*/
      await debug.wrap('rollback_main_transaction', async () => {
        return await MockTransactionDatabaseClient.rollback(mainTransactionId);
      }, {
        template: 'database',
        context: {
          sql: 'ROLLBACK',
          params: [],
          database: 'production',
          transaction: mainTransactionId,
          operation: 'rollback',
          error: error.message
        }
      });
      /*DEBUG:END*/
    }
    
    console.error(chalk.red('❌ Main transaction failed:'), error.message);
    throw error;
  }
}

async function runTransactionExamples() {
  console.log(chalk.blue('🚀 Starting Database Transaction Examples'));
  
  try {
    await testSimpleTransaction();
    await testTransactionRollback();
    await testDeadlockHandling();
    await testNestedTransactions();
    
    console.log(chalk.green('✅ All database transaction examples completed successfully!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for transaction debug data'));
    console.log(chalk.gray('📝 Debug data includes:'));
    console.log(chalk.gray('   - Transaction IDs and lifecycle (begin/commit/rollback)'));
    console.log(chalk.gray('   - Operations performed within transactions'));
    console.log(chalk.gray('   - Error handling and rollback scenarios'));
    console.log(chalk.gray('   - Deadlock detection and resolution'));
    console.log(chalk.gray('   - Nested transaction patterns (savepoints)'));
    console.log(chalk.gray('   - Transaction duration and operation counts'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error in transaction examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTransactionExamples();
}