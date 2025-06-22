#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, join } from 'node:path';
import chalk from 'chalk';

console.log(chalk.blue('📋 Running File System Log Processor Examples'));

// Log entry parser
class LogParser {
  static parseLogEntry(line) {
    // Parse format: "2025-06-20 08:00:01 [INFO] Message"
    const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.+)$/);
    if (!match) return null;
    
    const [, timestamp, level, message] = match;
    return {
      timestamp: new Date(timestamp),
      level: level.toUpperCase(),
      message: message.trim(),
      raw: line
    };
  }
  
  static categorizeLogEntry(entry) {
    const message = entry.message.toLowerCase();
    
    if (message.includes('login') || message.includes('logout') || message.includes('session')) {
      return 'authentication';
    } else if (message.includes('database') || message.includes('connection')) {
      return 'database';
    } else if (message.includes('error') || message.includes('failed')) {
      return 'error';
    } else if (message.includes('backup') || message.includes('archive')) {
      return 'maintenance';
    } else if (message.includes('memory') || message.includes('disk') || message.includes('rate limit')) {
      return 'performance';
    } else {
      return 'general';
    }
  }
}

async function testBasicLogReading() {
  console.log(chalk.yellow('📖 Testing basic log file reading...'));
  
  const logPath = resolve('./sample-data/app.log');
  
  /*DEBUG:START*/
  const logContent = await debug.wrap('read_full_log_file', async () => {
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
  
  const lines = logContent.split('').filter(line => line.trim());
  
  console.log(chalk.green('✅ Log file loaded:'), `${lines.length} lines`);
  console.log(chalk.gray('   File size:'), `${logContent.length} bytes`);
  console.log(chalk.gray('   First entry:'), lines[0]);
  console.log(chalk.gray('   Last entry:'), lines[lines.length - 1]);
  
  return { logContent, lines };
}

async function testStreamLogProcessing() {
  console.log(chalk.yellow('🌊 Testing streaming log file processing...'));
  
  const logPath = resolve('./sample-data/app.log');
  const entries = [];
  let lineCount = 0;
  
  /*DEBUG:START*/
  const streamResult = await debug.wrap('stream_process_log_file', async () => {
    const fileStream = createReadStream(logPath, { encoding: 'utf8' });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      lineCount++;
      const entry = LogParser.parseLogEntry(line);
      if (entry) {
        entries.push(entry);
      }
    }
    
    return {
      totalLines: lineCount,
      parsedEntries: entries.length,
      processingComplete: true
    };
  }, {
    template: 'file',
    context: {
      operation: 'stream_read',
      path: logPath,
      encoding: 'utf8',
      options: { highWaterMark: 1024 }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Stream processing completed'));
  console.log(chalk.gray('   Lines processed:'), streamResult.totalLines);
  console.log(chalk.gray('   Valid entries:'), streamResult.parsedEntries);
  console.log(chalk.gray('   Parse success rate:'), `${((streamResult.parsedEntries / streamResult.totalLines) * 100).toFixed(1)}%`);
  
  return entries;
}

async function testLogAnalysis(entries) {
  console.log(chalk.yellow('🔍 Testing log analysis and statistics...'));
  
  /*DEBUG:START*/
  const analysisResults = await debug.wrap('analyze_log_statistics', async () => {
    const stats = {
      total: entries.length,
      byLevel: {},
      byCategory: {},
      timeRange: {
        start: null,
        end: null
      },
      errorPatterns: [],
      userActivity: {}
    };
    
    // Process each entry
    for (const entry of entries) {
      // Count by log level
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      
      // Categorize entries
      const category = LogParser.categorizeLogEntry(entry);
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
      // Track time range
      if (!stats.timeRange.start || entry.timestamp < stats.timeRange.start) {
        stats.timeRange.start = entry.timestamp;
      }
      if (!stats.timeRange.end || entry.timestamp > stats.timeRange.end) {
        stats.timeRange.end = entry.timestamp;
      }
      
      // Extract error patterns
      if (entry.level === 'ERROR') {
        stats.errorPatterns.push({
          timestamp: entry.timestamp,
          message: entry.message
        });
      }
      
      // Track user activity
      const userMatch = entry.message.match(/(\w+@\w+\.\w+)/);
      if (userMatch) {
        const email = userMatch[1];
        stats.userActivity[email] = (stats.userActivity[email] || 0) + 1;
      }
    }
    
    return stats;
  }, {
    template: 'file',
    context: {
      operation: 'analyze',
      path: './sample-data/app.log',
      data: entries,
      encoding: 'utf8'
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Log analysis completed'));
  console.log(chalk.blue('📊 Statistics:'));
  console.log(chalk.gray('   Total entries:'), analysisResults.total);
  console.log(chalk.gray('   By level:'), Object.entries(analysisResults.byLevel)
    .map(([level, count]) => `${level}: ${count}`).join(', '));
  console.log(chalk.gray('   By category:'), Object.entries(analysisResults.byCategory)
    .map(([cat, count]) => `${cat}: ${count}`).join(', '));
  console.log(chalk.gray('   Error count:'), analysisResults.errorPatterns.length);
  console.log(chalk.gray('   Active users:'), Object.keys(analysisResults.userActivity).length);
  
  return analysisResults;
}

async function testLogFiltering() {
  console.log(chalk.yellow('🔽 Testing log filtering and extraction...'));
  
  const logPath = resolve('./sample-data/app.log');
  const errorLogPath = resolve('./sample-data/errors-only.log');
  
  /*DEBUG:START*/
  const errorEntries = await debug.wrap('filter_error_logs', async () => {
    const content = await readFile(logPath, 'utf8');
    const lines = content.split('').filter(line => line.trim());
    const errors = [];
    
    for (const line of lines) {
      if (line.includes('[ERROR]')) {
        const entry = LogParser.parseLogEntry(line);
        if (entry) {
          errors.push(entry);
        }
      }
    }
    
    return errors;
  }, {
    template: 'file',
    context: {
      operation: 'filter',
      path: logPath,
      encoding: 'utf8',
      options: { filter: 'ERROR' }
    }
  });
  /*DEBUG:END*/
  
  /*DEBUG:START*/
  await debug.wrap('write_filtered_error_log', async () => {
    const errorLogContent = errorEntries.map(entry => entry.raw).join('') + '';
    await writeFile(errorLogPath, errorLogContent, 'utf8');
    return { written: true, size: errorLogContent.length, entries: errorEntries.length };
  }, {
    template: 'file',
    context: {
      operation: 'write',
      path: errorLogPath,
      data: errorEntries,
      encoding: 'utf8',
      options: { encoding: 'utf8', flag: 'w' }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Error log filtering completed'));
  console.log(chalk.gray('   Errors found:'), errorEntries.length);
  console.log(chalk.gray('   Filtered log saved:'), errorLogPath);
  
  return errorEntries;
}

async function testLogRotationSimulation() {
  console.log(chalk.yellow('🔄 Testing log rotation simulation...'));
  
  // Create logs directory
  const logsDir = resolve('./sample-data/logs');
  
  /*DEBUG:START*/
  await debug.wrap('create_logs_directory', async () => {
    await mkdir(logsDir, { recursive: true });
    return { created: true, path: logsDir };
  }, {
    template: 'file',
    context: {
      operation: 'mkdir',
      path: logsDir,
      options: { recursive: true }
    }
  });
  /*DEBUG:END*/
  
  // Simulate multiple log files (rotation)
  const logFiles = [
    { name: 'app.log.1', content: 'Previous log content 1' },
    { name: 'app.log.2', content: 'Previous log content 2' },
    { name: 'app.log.3', content: 'Previous log content 3' }
  ];
  
  for (const logFile of logFiles) {
    const filePath = join(logsDir, logFile.name);
    
    /*DEBUG:START*/
    await debug.wrap(`write_rotated_log_${logFile.name.replace('.', '_')}`, async () => {
      await writeFile(filePath, logFile.content, 'utf8');
      return { written: true, size: logFile.content.length };
    }, {
      template: 'file',
      context: {
        operation: 'write',
        path: filePath,
        data: logFile.content,
        encoding: 'utf8',
        options: { encoding: 'utf8', flag: 'w' }
      }
    });
    /*DEBUG:END*/
  }
  
  console.log(chalk.green('✅ Log rotation simulation completed'));
  console.log(chalk.gray('   Rotated files created:'), logFiles.length);
  console.log(chalk.gray('   Logs directory:'), logsDir);
  
  return logFiles;
}

async function testLargeLogProcessing() {
  console.log(chalk.yellow('📏 Testing large log file processing...'));
  
  // Generate large log file
  const largeLogPath = resolve('./sample-data/large-app.log');
  const logEntries = [];
  
  // Generate 1000 log entries
  for (let i = 0; i < 1000; i++) {
    const timestamp = new Date(Date.now() - (1000 - i) * 60000); // Every minute backwards
    const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const level = levels[i % levels.length];
    const messages = [
      'User action performed',
      'Database query executed',
      'Cache hit occurred',
      'API request processed',
      'File operation completed'
    ];
    const message = messages[i % messages.length];
    
    logEntries.push(`${timestamp.toISOString().slice(0, 19).replace('T', ' ')} [${level}] ${message} #${i}`);
  }
  
  const largeLogContent = logEntries.join('') + '';
  
  /*DEBUG:START*/
  await debug.wrap('write_large_log_file', async () => {
    await writeFile(largeLogPath, largeLogContent, 'utf8');
    return { written: true, size: largeLogContent.length, entries: logEntries.length };
  }, {
    template: 'file',
    context: {
      operation: 'write',
      path: largeLogPath,
      data: largeLogContent,
      encoding: 'utf8',
      options: { encoding: 'utf8', flag: 'w' }
    }
  });
  /*DEBUG:END*/
  
  // Process large log file in chunks
  /*DEBUG:START*/
  const processingResult = await debug.wrap('process_large_log_chunked', async () => {
    let processedLines = 0;
    let chunkCount = 0;
    
    const fileStream = createReadStream(largeLogPath, { 
      encoding: 'utf8',
      highWaterMark: 1024 * 16 // 16KB chunks
    });
    
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      processedLines++;
      if (processedLines % 100 === 0) {
        chunkCount++;
      }
    }
    
    return {
      totalLines: processedLines,
      chunks: chunkCount,
      processingComplete: true
    };
  }, {
    template: 'file',
    context: {
      operation: 'stream_read',
      path: largeLogPath,
      encoding: 'utf8',
      options: { highWaterMark: 16384, chunked: true }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Large log processing completed'));
  console.log(chalk.gray('   File size:'), `${largeLogContent.length} bytes`);
  console.log(chalk.gray('   Lines processed:'), processingResult.totalLines);
  console.log(chalk.gray('   Processing chunks:'), processingResult.chunks);
  
  return processingResult;
}

async function testConcurrentLogProcessing() {
  console.log(chalk.yellow('⚡ Testing concurrent log file processing...'));
  
  const logFiles = [
    './sample-data/app.log',
    './sample-data/errors-only.log',
    './sample-data/large-app.log'
  ];
  
  const startTime = Date.now();
  
  const processingPromises = logFiles.map((logPath, index) => {
    const resolvedPath = resolve(logPath);
    
    /*DEBUG:START*/
    return debug.wrap(`concurrent_log_process_${index}`, async () => {
      const content = await readFile(resolvedPath, 'utf8');
      const lines = content.split('').filter(line => line.trim());
      const entries = lines.map(line => LogParser.parseLogEntry(line)).filter(Boolean);
      
      return {
        file: logPath,
        lines: lines.length,
        entries: entries.length,
        size: content.length
      };
    }, {
      template: 'file',
      context: {
        operation: 'read',
        path: resolvedPath,
        encoding: 'utf8',
        concurrent: true,
        index
      }
    });
    /*DEBUG:END*/
  });
  
  const results = await Promise.all(processingPromises);
  const totalTime = Date.now() - startTime;
  
  console.log(chalk.green('✅ Concurrent log processing completed'));
  console.log(chalk.gray('   Files processed:'), results.length);
  console.log(chalk.gray('   Total time:'), `${totalTime}ms`);
  console.log(chalk.gray('   Total lines:'), results.reduce((sum, r) => sum + r.lines, 0));
  console.log(chalk.gray('   Total entries:'), results.reduce((sum, r) => sum + r.entries, 0));
  
  return results;
}

async function runLogProcessorExamples() {
  console.log(chalk.blue('🚀 Starting File System Log Processor Examples'));
  
  try {
    const { logContent, lines } = await testBasicLogReading();
    const entries = await testStreamLogProcessing();
    const analysisResults = await testLogAnalysis(entries);
    const errorEntries = await testLogFiltering();
    const rotatedLogs = await testLogRotationSimulation();
    const largeLogResult = await testLargeLogProcessing();
    const concurrentResults = await testConcurrentLogProcessing();
    
    console.log(chalk.green('✅ All file system log processor examples completed successfully!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for log processing debug data'));
    console.log(chalk.gray('📝 Debug data includes:'));
    console.log(chalk.gray('   - Log file reading and parsing operations'));
    console.log(chalk.gray('   - Stream processing performance metrics'));
    console.log(chalk.gray('   - Log analysis and filtering operations'));
    console.log(chalk.gray('   - File creation and rotation simulation'));
    console.log(chalk.gray('   - Large file processing with chunking'));
    console.log(chalk.gray('   - Concurrent file processing timing'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error in log processor examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLogProcessorExamples();
}