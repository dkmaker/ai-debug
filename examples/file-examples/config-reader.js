#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import { readFile, stat, access, constants, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import chalk from 'chalk';

console.log(chalk.blue('📁 Running File System Configuration Reader Examples'));

// Simulate YAML parser (simplified)
class MockYAMLParser {
  static parse(yamlContent) {
    // Simple YAML-like parsing for demonstration
    const lines = yamlContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    const config = {};
    let currentSection = config;
    const sectionStack = [config];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        
        if (value === '') {
          // Section header
          currentSection[key.trim()] = {};
          sectionStack.push(currentSection[key.trim()]);
          currentSection = currentSection[key.trim()];
        } else {
          // Key-value pair
          currentSection[key.trim()] = isNaN(Number(value)) ? value.replace(/['"]/g, '') : Number(value);
        }
      }
    }
    
    return config;
  }
}

async function testJsonConfigReading() {
  console.log(chalk.yellow('📋 Testing JSON configuration file reading...'));
  
  const configPath = resolve('./sample-data/config.json');
  
  /*DEBUG:START*/
  const configContent = await debug.wrap('read_json_config', async () => {
    return await readFile(configPath, 'utf8');
  }, {
    template: 'file',
    context: {
      operation: 'read',
      path: configPath,
      encoding: 'utf8',
      options: { encoding: 'utf8' }
    }
  });
  /*DEBUG:END*/
  
  /*DEBUG:START*/
  const parsedConfig = await debug.wrap('parse_json_config', async () => {
    return JSON.parse(configContent);
  }, {
    template: 'file',
    context: {
      operation: 'parse',
      path: configPath,
      data: configContent,
      encoding: 'utf8'
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ JSON config loaded:'), parsedConfig.app.name);
  console.log(chalk.gray('   Environment:'), parsedConfig.app.environment);
  console.log(chalk.gray('   Database:'), `${parsedConfig.database.host}:${parsedConfig.database.port}`);
  
  return parsedConfig;
}

async function testFileStatistics() {
  console.log(chalk.yellow('📊 Testing file statistics and metadata...'));
  
  const configPath = resolve('./sample-data/config.json');
  const usersPath = resolve('./sample-data/users.json');
  const logPath = resolve('./sample-data/app.log');
  
  const files = [
    { name: 'config.json', path: configPath },
    { name: 'users.json', path: usersPath },
    { name: 'app.log', path: logPath }
  ];
  
  for (const file of files) {
    /*DEBUG:START*/
    const stats = await debug.wrap(`get_file_stats_${file.name.replace('.', '_')}`, async () => {
      return await stat(file.path);
    }, {
      template: 'file',
      context: {
        operation: 'stat',
        path: file.path,
        options: { bigint: false }
      }
    });
    /*DEBUG:END*/
    
    console.log(chalk.blue(`📄 ${file.name}:`));
    console.log(chalk.gray('   Size:'), `${stats.size} bytes`);
    console.log(chalk.gray('   Modified:'), stats.mtime.toISOString());
    console.log(chalk.gray('   Type:'), stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other');
  }
  
  return files.map((file, index) => ({ ...file, stats: files[index] }));
}

async function testFileAccessibilityCheck() {
  console.log(chalk.yellow('🔍 Testing file accessibility and permissions...'));
  
  const testFiles = [
    './sample-data/config.json',
    './sample-data/users.json', 
    './sample-data/app.log',
    './sample-data/nonexistent.json' // This should fail
  ];
  
  for (const filePath of testFiles) {
    const resolvedPath = resolve(filePath);
    
    try {
      /*DEBUG:START*/
      await debug.wrap(`check_file_access_${filePath.split('/').pop().replace('.', '_')}`, async () => {
        await access(resolvedPath, constants.F_OK | constants.R_OK);
        return { accessible: true, readable: true };
      }, {
        template: 'file',
        context: {
          operation: 'access',
          path: resolvedPath,
          options: { mode: constants.F_OK | constants.R_OK }
        }
      });
      /*DEBUG:END*/
      
      console.log(chalk.green('✅'), filePath, '- accessible and readable');
      
    } catch (error) {
      console.log(chalk.red('❌'), filePath, `- ${error.code}: ${error.message}`);
    }
  }
}

async function testLargeFileReading() {
  console.log(chalk.yellow('📖 Testing large file reading with different encodings...'));
  
  const logPath = resolve('./sample-data/app.log');
  
  // Read as UTF-8
  /*DEBUG:START*/
  const utf8Content = await debug.wrap('read_log_utf8', async () => {
    return await readFile(logPath, 'utf8');
  }, {
    template: 'file',
    context: {
      operation: 'read',
      path: logPath,
      encoding: 'utf8',
      options: { encoding: 'utf8' }
    }
  });
  /*DEBUG:END*/
  
  // Read as Buffer (binary)
  /*DEBUG:START*/
  const bufferContent = await debug.wrap('read_log_buffer', async () => {
    return await readFile(logPath);
  }, {
    template: 'file',
    context: {
      operation: 'read',
      path: logPath,
      encoding: 'binary',
      options: { encoding: null }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ UTF-8 reading:'), `${utf8Content.length} characters`);
  console.log(chalk.green('✅ Buffer reading:'), `${bufferContent.length} bytes`);
  console.log(chalk.gray('   First line:'), utf8Content.split('')[0]);
  
  return { utf8Content, bufferContent };
}

async function testYamlConfigCreation() {
  console.log(chalk.yellow('📝 Testing YAML config creation and parsing...'));
  
  const yamlConfig = `# Application Configuration
app:
  name: Example YAML App
  version: 2.0.0
  environment: staging
  features:
    enableNotifications: true
    enableAnalytics: true
    maxFileSize: 20MB

database:
  host: yaml-db.example.com
  port: 5432
  name: yaml_example_db
  ssl: true

cache:
  ttl: 7200
  maxSize: 2000`;

  const yamlPath = resolve('./sample-data/config.yaml');
  
  // Write YAML file
  /*DEBUG:START*/
  await debug.wrap('write_yaml_config', async () => {
    await writeFile(yamlPath, yamlConfig, 'utf8');
    return { written: true, size: yamlConfig.length };
  }, {
    template: 'file',
    context: {
      operation: 'write',
      path: yamlPath,
      data: yamlConfig,
      encoding: 'utf8',
      options: { encoding: 'utf8', flag: 'w' }
    }
  });
  /*DEBUG:END*/
  
  // Read and parse YAML file
  /*DEBUG:START*/
  const yamlContent = await debug.wrap('read_yaml_config', async () => {
    return await readFile(yamlPath, 'utf8');
  }, {
    template: 'file',
    context: {
      operation: 'read',
      path: yamlPath,
      encoding: 'utf8',
      options: { encoding: 'utf8' }
    }
  });
  /*DEBUG:END*/
  
  /*DEBUG:START*/
  const parsedYaml = await debug.wrap('parse_yaml_config', async () => {
    return MockYAMLParser.parse(yamlContent);
  }, {
    template: 'file',
    context: {
      operation: 'parse',
      path: yamlPath,
      data: yamlContent,
      encoding: 'utf8'
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ YAML config created and parsed'));
  console.log(chalk.gray('   App name:'), parsedYaml.app?.name);
  console.log(chalk.gray('   Environment:'), parsedYaml.app?.environment);
  console.log(chalk.gray('   Cache TTL:'), parsedYaml.cache?.ttl);
  
  return parsedYaml;
}

async function testConfigValidation() {
  console.log(chalk.yellow('✅ Testing configuration validation with error handling...'));
  
  // Test with invalid JSON
  const invalidJsonPath = resolve('./sample-data/invalid-config.json');
  const invalidJson = '{ "app": { "name": "Test", "version": "1.0.0" } // Invalid comment }';
  
  /*DEBUG:START*/
  await debug.wrap('write_invalid_json', async () => {
    await writeFile(invalidJsonPath, invalidJson, 'utf8');
    return { written: true, size: invalidJson.length };
  }, {
    template: 'file',
    context: {
      operation: 'write',
      path: invalidJsonPath,
      data: invalidJson,
      encoding: 'utf8',
      options: { encoding: 'utf8', flag: 'w' }
    }
  });
  /*DEBUG:END*/
  
  try {
    /*DEBUG:START*/
    const invalidContent = await debug.wrap('read_invalid_config', async () => {
      return await readFile(invalidJsonPath, 'utf8');
    }, {
      template: 'file',
      context: {
        operation: 'read',
        path: invalidJsonPath,
        encoding: 'utf8',
        options: { encoding: 'utf8' }
      }
    });
    /*DEBUG:END*/
    
    /*DEBUG:START*/
    await debug.wrap('parse_invalid_json', async () => {
      return JSON.parse(invalidContent);
    }, {
      template: 'file',
      context: {
        operation: 'parse',
        path: invalidJsonPath,
        data: invalidContent,
        encoding: 'utf8'
      }
    });
    /*DEBUG:END*/
    
  } catch (error) {
    console.log(chalk.red('✅ Caught expected JSON parse error:'), error.message);
    console.log(chalk.gray('   Error type:'), error.constructor.name);
  }
}

async function testConcurrentFileOperations() {
  console.log(chalk.yellow('⚡ Testing concurrent file operations...'));
  
  const configPath = resolve('./sample-data/config.json');
  const usersPath = resolve('./sample-data/users.json');
  const logPath = resolve('./sample-data/app.log');
  
  // Read multiple files concurrently
  const startTime = Date.now();
  
  const readPromises = [
    /*DEBUG:START*/
    debug.wrap('concurrent_read_config', async () => {
      return await readFile(configPath, 'utf8');
    }, {
      template: 'file',
      context: {
        operation: 'read',
        path: configPath,
        encoding: 'utf8',
        concurrent: true
      }
    }),
    /*DEBUG:END*/
    
    /*DEBUG:START*/
    debug.wrap('concurrent_read_users', async () => {
      return await readFile(usersPath, 'utf8');
    }, {
      template: 'file',
      context: {
        operation: 'read',
        path: usersPath,
        encoding: 'utf8',
        concurrent: true
      }
    }),
    /*DEBUG:END*/
    
    /*DEBUG:START*/
    debug.wrap('concurrent_read_logs', async () => {
      return await readFile(logPath, 'utf8');
    }, {
      template: 'file',
      context: {
        operation: 'read',
        path: logPath,
        encoding: 'utf8',
        concurrent: true
      }
    })
    /*DEBUG:END*/
  ];
  
  const results = await Promise.all(readPromises);
  const totalTime = Date.now() - startTime;
  
  console.log(chalk.green('✅ Concurrent file reads completed'));
  console.log(chalk.gray('   Files read:'), results.length);
  console.log(chalk.gray('   Total time:'), `${totalTime}ms`);
  console.log(chalk.gray('   Avg per file:'), `${(totalTime / results.length).toFixed(1)}ms`);
  
  return results;
}

async function runConfigReaderExamples() {
  console.log(chalk.blue('🚀 Starting File System Configuration Reader Examples'));
  
  try {
    await testJsonConfigReading();
    await testFileStatistics();
    await testFileAccessibilityCheck();
    await testLargeFileReading();
    await testYamlConfigCreation();
    await testConfigValidation();
    await testConcurrentFileOperations();
    
    console.log(chalk.green('✅ All file system configuration reader examples completed successfully!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for file operation debug data'));
    console.log(chalk.gray('📝 Debug data includes:'));
    console.log(chalk.gray('   - File paths and operation types'));
    console.log(chalk.gray('   - File sizes and encoding information'));
    console.log(chalk.gray('   - Read/write performance metrics'));
    console.log(chalk.gray('   - File access permissions and errors'));
    console.log(chalk.gray('   - Concurrent operation timing'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error in file system examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runConfigReaderExamples();
  
}