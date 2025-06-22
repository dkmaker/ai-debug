#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import chalk from 'chalk';

console.log(chalk.blue('🗄️  Running Database User Query Examples'));

// Mock database with realistic user data
const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', created_at: '2024-01-15', last_login: '2025-06-20' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', created_at: '2024-02-20', last_login: '2025-06-19' },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'user', created_at: '2024-03-10', last_login: '2025-06-18' },
  { id: 4, name: 'Alice Johnson', email: 'alice@example.com', role: 'moderator', created_at: '2024-01-30', last_login: '2025-06-20' },
  { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', role: 'user', created_at: '2024-04-05', last_login: '2025-06-17' }
];

const mockOrders = [
  { id: 101, user_id: 1, total: 299.99, status: 'completed', created_at: '2025-06-15' },
  { id: 102, user_id: 2, total: 149.50, status: 'pending', created_at: '2025-06-18' },
  { id: 103, user_id: 1, total: 89.99, status: 'completed', created_at: '2025-06-19' },
  { id: 104, user_id: 3, total: 199.00, status: 'shipped', created_at: '2025-06-17' }
];

// Mock Database Client
class MockDatabaseClient {
  static async query(sql, params = []) {
    // Simulate network delay based on query complexity
    const baseDelay = 30;
    const complexityDelay = sql.includes('JOIN') ? 50 : sql.includes('WHERE') ? 20 : 10;
    await new Promise(resolve => setTimeout(resolve, baseDelay + complexityDelay + Math.random() * 50));
    
    // Parse SQL to determine operation and simulate response
    const upperSql = sql.trim().toUpperCase();
    
    if (upperSql.startsWith('SELECT')) {
      return this.handleSelect(sql, params);
    } else if (upperSql.includes('ERROR')) {
      // Simulate database error
      const error = new Error('Table \'nonexistent\' doesn\'t exist');
      error.code = 'ER_NO_SUCH_TABLE';
      error.sqlState = '42S02';
      throw error;
    }
    
    return { rows: [], fields: [], affectedRows: 0 };
  }
  
  static handleSelect(sql, params) {
    const upperSql = sql.trim().toUpperCase();
    let results = [];
    let fields = [];
    let rowsExamined = 0;
    
    if (upperSql.includes('FROM USERS')) {
      results = [...mockUsers];
      fields = ['id', 'name', 'email', 'role', 'created_at', 'last_login'];
      rowsExamined = mockUsers.length;
      
      // Apply WHERE conditions
      if (upperSql.includes('WHERE ID = ?') && params[0]) {
        results = results.filter(user => user.id === params[0]);
        rowsExamined = mockUsers.length; // Still examined all rows
      } else if (upperSql.includes('WHERE EMAIL = ?') && params[0]) {
        results = results.filter(user => user.email === params[0]);
        rowsExamined = mockUsers.length;
      } else if (upperSql.includes('WHERE ROLE = ?') && params[0]) {
        results = results.filter(user => user.role === params[0]);
        rowsExamined = mockUsers.length;
      }
      
      // Apply LIMIT
      if (upperSql.includes('LIMIT')) {
        const limitMatch = upperSql.match(/LIMIT (\d+)/);
        if (limitMatch) {
          results = results.slice(0, parseInt(limitMatch[1]));
        }
      }
      
      // Apply OFFSET
      if (upperSql.includes('OFFSET')) {
        const offsetMatch = upperSql.match(/OFFSET (\d+)/);
        if (offsetMatch) {
          const offset = parseInt(offsetMatch[1]);
          results = results.slice(offset);
        }
      }
    } else if (upperSql.includes('JOIN')) {
      // Handle JOIN queries
      fields = ['user_id', 'user_name', 'user_email', 'order_id', 'order_total', 'order_status'];
      results = mockUsers.map(user => {
        const userOrders = mockOrders.filter(order => order.user_id === user.id);
        if (userOrders.length === 0) {
          return {
            user_id: user.id,
            user_name: user.name,
            user_email: user.email,
            order_id: null,
            order_total: null,
            order_status: null
          };
        }
        return userOrders.map(order => ({
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          order_id: order.id,
          order_total: order.total,
          order_status: order.status
        }));
      }).flat();
      rowsExamined = mockUsers.length + mockOrders.length;
    }
    
    return {
      rows: results,
      fields: fields.map(name => ({ name })),
      rowsExamined
    };
  }
}

async function testSimpleUserLookup() {
  console.log(chalk.yellow('🔍 Testing simple user lookup by ID...'));
  
  /*DEBUG:START*/
  const user = await debug.wrap('lookup_user_by_id', async () => {
    return await MockDatabaseClient.query(
      'SELECT * FROM users WHERE id = ?', 
      [1]
    );
  }, {
    template: 'database',
    context: {
      sql: 'SELECT * FROM users WHERE id = ?',
      params: [1],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Found user:'), user.rows[0]?.name);
  return user;
}

async function testUserSearchByEmail() {
  console.log(chalk.yellow('📧 Testing user search by email...'));
  
  /*DEBUG:START*/
  const user = await debug.wrap('lookup_user_by_email', async () => {
    return await MockDatabaseClient.query(
      'SELECT id, name, email, role FROM users WHERE email = ?',
      ['jane@example.com']
    );
  }, {
    template: 'database',
    context: {
      sql: 'SELECT id, name, email, role FROM users WHERE email = ?',
      params: ['jane@example.com'],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Found user by email:'), user.rows[0]?.name);
  return user;
}

async function testUsersByRole() {
  console.log(chalk.yellow('👥 Testing users by role query...'));
  
  /*DEBUG:START*/
  const users = await debug.wrap('lookup_users_by_role', async () => {
    return await MockDatabaseClient.query(
      'SELECT id, name, role FROM users WHERE role = ?',
      ['user']
    );
  }, {
    template: 'database',
    context: {
      sql: 'SELECT id, name, role FROM users WHERE role = ?',
      params: ['user'],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Found users with role "user":'), users.rows.length);
  return users;
}

async function testPaginatedQuery() {
  console.log(chalk.yellow('📄 Testing paginated user query...'));
  
  /*DEBUG:START*/
  const page1 = await debug.wrap('paginated_users_page1', async () => {
    return await MockDatabaseClient.query(
      'SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 2 OFFSET 0'
    );
  }, {
    template: 'database',
    context: {
      sql: 'SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 2 OFFSET 0',
      params: [],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Page 1 results:'), page1.rows.length, 'users');
  
  /*DEBUG:START*/
  const page2 = await debug.wrap('paginated_users_page2', async () => {
    return await MockDatabaseClient.query(
      'SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 2 OFFSET 2'
    );
  }, {
    template: 'database',
    context: {
      sql: 'SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 2 OFFSET 2',
      params: [],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Page 2 results:'), page2.rows.length, 'users');
  return [page1, page2];
}

async function testJoinQuery() {
  console.log(chalk.yellow('🔗 Testing JOIN query (users with orders)...'));
  
  /*DEBUG:START*/
  const usersWithOrders = await debug.wrap('users_with_orders_join', async () => {
    return await MockDatabaseClient.query(`
      SELECT u.id as user_id, u.name as user_name, u.email as user_email,
             o.id as order_id, o.total as order_total, o.status as order_status
      FROM users u 
      LEFT JOIN orders o ON u.id = o.user_id
      ORDER BY u.id
    `);
  }, {
    template: 'database',
    context: {
      sql: 'SELECT u.id as user_id, u.name as user_name, u.email as user_email, o.id as order_id, o.total as order_total, o.status as order_status FROM users u LEFT JOIN orders o ON u.id = o.user_id ORDER BY u.id',
      params: [],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ JOIN query results:'), usersWithOrders.rows.length, 'records');
  return usersWithOrders;
}

async function testCachedQuery() {
  console.log(chalk.yellow('🔄 Testing cached query (same user lookup twice)...'));
  
  // First query (cache miss)
  /*DEBUG:START*/
  const user1 = await debug.wrap('cached_user_lookup', async () => {
    return await MockDatabaseClient.query(
      'SELECT * FROM users WHERE id = ?',
      [2]
    );
  }, {
    template: 'database',
    context: {
      sql: 'SELECT * FROM users WHERE id = ?',
      params: [2],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.blue('📊 First query (cache miss)'), user1.rows[0]?.name);
  
  // Second query (should be cache hit)
  /*DEBUG:START*/
  const user2 = await debug.wrap('cached_user_lookup', async () => {
    return await MockDatabaseClient.query(
      'SELECT * FROM users WHERE id = ?',
      [2]
    );
  }, {
    template: 'database',
    context: {
      sql: 'SELECT * FROM users WHERE id = ?',
      params: [2],
      database: 'production',
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.blue('📊 Second query (cache hit)'), user2.rows[0]?.name);
  return [user1, user2];
}

async function testErrorHandling() {
  console.log(chalk.yellow('❌ Testing database error handling...'));
  
  try {
    /*DEBUG:START*/
    await debug.wrap('query_nonexistent_table', async () => {
      return await MockDatabaseClient.query('SELECT * FROM nonexistent_table_error');
    }, {
      template: 'database',
      context: {
        sql: 'SELECT * FROM nonexistent_table_error',
        params: [],
        database: 'production',
      }
    });
    /*DEBUG:END*/
  } catch (error) {
    console.log(chalk.red('✅ Caught expected error:'), error.message);
    console.log(chalk.gray('   SQL State:'), error.sqlState);
    console.log(chalk.gray('   Error Code:'), error.code);
  }
}

async function runUserQueryExamples() {
  console.log(chalk.blue('🚀 Starting Database User Query Examples'));
  
  try {
    await testSimpleUserLookup();
    await testUserSearchByEmail();
    await testUsersByRole();
    await testPaginatedQuery();
    await testJoinQuery();
    await testCachedQuery();
    await testErrorHandling();
    
    console.log(chalk.green('✅ All database user query examples completed successfully!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for database debug data'));
    console.log(chalk.gray('📝 Debug data includes:'));
    console.log(chalk.gray('   - SQL queries and parameters'));
    console.log(chalk.gray('   - Row counts and field information'));
    console.log(chalk.gray('   - Query performance metrics'));
    console.log(chalk.gray('   - Cache hit/miss information'));
    console.log(chalk.gray('   - Error codes and SQL states'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error in database examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runUserQueryExamples();
}