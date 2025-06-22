#!/usr/bin/env node

import { debug } from '../.ai-debug/wrapper.js';
import { readFile, writeFile, copyFile, unlink, mkdir, rmdir, readdir, stat, rename } from 'node:fs/promises';
import { join, resolve, dirname, basename, extname } from 'node:path';
import chalk from 'chalk';

console.log(chalk.blue('📦 Running File System Batch Operations Examples'));

// File operations utility
class FileOperationsUtility {
  static generateTestFiles(count = 10) {
    const files = [];
    const types = ['txt', 'json', 'log', 'csv'];
    const contents = {
      txt: 'This is a test text file content.',
      json: '{"test": true, "value": 42}',
      log: '2025-06-20 12:00:00 [INFO] Test log entry',
      csv: 'id,name,value1,test,1002,demo,200'
    };
    
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      files.push({
        name: `test-file-${i.toString().padStart(3, '0')}.${type}`,
        content: contents[type] + ` (file ${i})`,
        type
      });
    }
    
    return files;
  }
  
  static async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    const files = await readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = join(dirPath, file.name);
      if (file.isFile()) {
        const stats = await stat(filePath);
        totalSize += stats.size;
      } else if (file.isDirectory()) {
        totalSize += await this.calculateDirectorySize(filePath);
      }
    }
    
    return totalSize;
  }
}

async function testBatchFileCreation() {
  console.log(chalk.yellow('📝 Testing batch file creation...'));
  
  const batchDir = resolve('./sample-data/batch-test');
  
  // Create directory
  /*DEBUG:START*/
  await debug.wrap('create_batch_directory', async () => {
    await mkdir(batchDir, { recursive: true });
    return { created: true, path: batchDir };
  }, {
    template: 'file',
    context: {
      operation: 'mkdir',
      path: batchDir,
      options: { recursive: true }
    }
  });
  /*DEBUG:END*/
  
  // Generate test files
  const testFiles = FileOperationsUtility.generateTestFiles(20);
  const createdFiles = [];
  
  /*DEBUG:START*/
  const batchCreateResult = await debug.wrap('batch_create_files', async () => {
    const results = [];
    
    for (const file of testFiles) {
      const filePath = join(batchDir, file.name);
      await writeFile(filePath, file.content, 'utf8');
      results.push({
        name: file.name,
        path: filePath,
        size: file.content.length,
        type: file.type
      });
      createdFiles.push(filePath);
    }
    
    return {
      filesCreated: results.length,
      totalSize: results.reduce((sum, f) => sum + f.size, 0),
      types: [...new Set(results.map(f => f.type))]
    };
  }, {
    template: 'file',
    context: {
      operation: 'batch_write',
      path: batchDir,
      data: testFiles,
      encoding: 'utf8',
      options: { batchSize: testFiles.length }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch file creation completed'));
  console.log(chalk.gray('   Files created:'), batchCreateResult.filesCreated);
  console.log(chalk.gray('   Total size:'), `${batchCreateResult.totalSize} bytes`);
  console.log(chalk.gray('   File types:'), batchCreateResult.types.join(', '));
  
  return { batchDir, createdFiles };
}

async function testBatchFileReading(batchDir) {
  console.log(chalk.yellow('📖 Testing batch file reading...'));
  
  /*DEBUG:START*/
  const batchReadResult = await debug.wrap('batch_read_files', async () => {
    const files = await readdir(batchDir);
    const readResults = [];
    
    for (const fileName of files) {
      const filePath = join(batchDir, fileName);
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        const content = await readFile(filePath, 'utf8');
        readResults.push({
          name: fileName,
          size: stats.size,
          content: content.substring(0, 100), // First 100 chars
          modified: stats.mtime
        });
      }
    }
    
    return {
      filesRead: readResults.length,
      totalSize: readResults.reduce((sum, f) => sum + f.size, 0),
      files: readResults
    };
  }, {
    template: 'file',
    context: {
      operation: 'batch_read',
      path: batchDir,
      encoding: 'utf8',
      options: { fileCount: 'auto' }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch file reading completed'));
  console.log(chalk.gray('   Files read:'), batchReadResult.filesRead);
  console.log(chalk.gray('   Total size read:'), `${batchReadResult.totalSize} bytes`);
  
  return batchReadResult;
}

async function testBatchFileCopying(batchDir) {
  console.log(chalk.yellow('📋 Testing batch file copying...'));
  
  const copyDir = resolve('./sample-data/batch-copy');
  
  /*DEBUG:START*/
  await debug.wrap('create_copy_directory', async () => {
    await mkdir(copyDir, { recursive: true });
    return { created: true, path: copyDir };
  }, {
    template: 'file',
    context: {
      operation: 'mkdir',
      path: copyDir,
      options: { recursive: true }
    }
  });
  /*DEBUG:END*/
  
  /*DEBUG:START*/
  const batchCopyResult = await debug.wrap('batch_copy_files', async () => {
    const sourceFiles = await readdir(batchDir);
    const copyResults = [];
    
    for (const fileName of sourceFiles) {
      const sourcePath = join(batchDir, fileName);
      const destPath = join(copyDir, `copy-${fileName}`);
      
      const sourceStats = await stat(sourcePath);
      if (sourceStats.isFile()) {
        await copyFile(sourcePath, destPath);
        const destStats = await stat(destPath);
        
        copyResults.push({
          source: sourcePath,
          destination: destPath,
          size: destStats.size,
          success: true
        });
      }
    }
    
    return {
      filesCopied: copyResults.length,
      totalSize: copyResults.reduce((sum, f) => sum + f.size, 0),
      operations: copyResults
    };
  }, {
    template: 'file',
    context: {
      operation: 'batch_copy',
      path: batchDir,
      destination: copyDir,
      options: { preserveTimestamps: false }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch file copying completed'));
  console.log(chalk.gray('   Files copied:'), batchCopyResult.filesCopied);
  console.log(chalk.gray('   Total size copied:'), `${batchCopyResult.totalSize} bytes`);
  console.log(chalk.gray('   Copy directory:'), copyDir);
  
  return { copyDir, batchCopyResult };
}

async function testBatchFileRenaming(batchDir) {
  console.log(chalk.yellow('🏷️  Testing batch file renaming...'));
  
  /*DEBUG:START*/
  const batchRenameResult = await debug.wrap('batch_rename_files', async () => {
    const files = await readdir(batchDir);
    const renameResults = [];
    
    for (const fileName of files) {
      const oldPath = join(batchDir, fileName);
      const stats = await stat(oldPath);
      
      if (stats.isFile() && fileName.includes('.txt')) {
        const newFileName = fileName.replace('.txt', '-renamed.txt');
        const newPath = join(batchDir, newFileName);
        
        await rename(oldPath, newPath);
        renameResults.push({
          oldName: fileName,
          newName: newFileName,
          oldPath,
          newPath,
          size: stats.size
        });
      }
    }
    
    return {
      filesRenamed: renameResults.length,
      operations: renameResults
    };
  }, {
    template: 'file',
    context: {
      operation: 'batch_rename',
      path: batchDir,
      pattern: '*.txt',
      options: { suffix: '-renamed' }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch file renaming completed'));
  console.log(chalk.gray('   Files renamed:'), batchRenameResult.filesRenamed);
  
  return batchRenameResult;
}

async function testFileFilteringAndSorting(batchDir) {
  console.log(chalk.yellow('🔍 Testing file filtering and sorting...'));
  
  /*DEBUG:START*/
  const filterSortResult = await debug.wrap('filter_and_sort_files', async () => {
    const files = await readdir(batchDir);
    const fileDetails = [];
    
    for (const fileName of files) {
      const filePath = join(batchDir, fileName);
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        fileDetails.push({
          name: fileName,
          path: filePath,
          size: stats.size,
          extension: extname(fileName),
          modified: stats.mtime,
          type: extname(fileName).slice(1) || 'unknown'
        });
      }
    }
    
    // Filter by type and sort by size
    const jsonFiles = fileDetails.filter(f => f.type === 'json').sort((a, b) => b.size - a.size);
    const logFiles = fileDetails.filter(f => f.type === 'log').sort((a, b) => a.modified - b.modified);
    const largeFiles = fileDetails.filter(f => f.size > 50).sort((a, b) => b.size - a.size);
    
    return {
      totalFiles: fileDetails.length,
      jsonFiles: jsonFiles.length,
      logFiles: logFiles.length,
      largeFiles: largeFiles.length,
      fileTypes: [...new Set(fileDetails.map(f => f.type))],
      averageSize: fileDetails.reduce((sum, f) => sum + f.size, 0) / fileDetails.length
    };
  }, {
    template: 'file',
    context: {
      operation: 'filter_sort',
      path: batchDir,
      encoding: 'utf8',
      options: { 
        filters: ['json', 'log', 'size>50'],
        sortBy: 'size'
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ File filtering and sorting completed'));
  console.log(chalk.gray('   Total files:'), filterSortResult.totalFiles);
  console.log(chalk.gray('   JSON files:'), filterSortResult.jsonFiles);
  console.log(chalk.gray('   Log files:'), filterSortResult.logFiles);
  console.log(chalk.gray('   Large files:'), filterSortResult.largeFiles);
  console.log(chalk.gray('   File types:'), filterSortResult.fileTypes.join(', '));
  console.log(chalk.gray('   Average size:'), `${filterSortResult.averageSize.toFixed(1)} bytes`);
  
  return filterSortResult;
}

async function testBatchFileArchiving() {
  console.log(chalk.yellow('📦 Testing batch file archiving simulation...'));
  
  const batchDir = resolve('./sample-data/batch-test');
  const archiveDir = resolve('./sample-data/archive');
  
  /*DEBUG:START*/
  await debug.wrap('create_archive_directory', async () => {
    await mkdir(archiveDir, { recursive: true });
    return { created: true, path: archiveDir };
  }, {
    template: 'file',
    context: {
      operation: 'mkdir',
      path: archiveDir,
      options: { recursive: true }
    }
  });
  /*DEBUG:END*/
  
  /*DEBUG:START*/
  const archiveResult = await debug.wrap('batch_archive_files', async () => {
    const files = await readdir(batchDir);
    const archivedFiles = [];
    
    for (const fileName of files) {
      const sourcePath = join(batchDir, fileName);
      const stats = await stat(sourcePath);
      
      if (stats.isFile() && stats.mtime < new Date(Date.now() - 60000)) { // Older than 1 minute
        const archiveName = `${new Date().toISOString().slice(0, 10)}-${fileName}`;
        const archivePath = join(archiveDir, archiveName);
        
        // Move file to archive (copy + delete)
        await copyFile(sourcePath, archivePath);
        await unlink(sourcePath);
        
        archivedFiles.push({
          originalName: fileName,
          archiveName,
          size: stats.size,
          archivedAt: new Date()
        });
      }
    }
    
    return {
      filesArchived: archivedFiles.length,
      totalSize: archivedFiles.reduce((sum, f) => sum + f.size, 0),
      archiveDirectory: archiveDir,
      operations: archivedFiles
    };
  }, {
    template: 'file',
    context: {
      operation: 'batch_archive',
      path: batchDir,
      destination: archiveDir,
      options: { 
        archiveOlderThan: '1 minute',
        deleteOriginal: true
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch file archiving completed'));
  console.log(chalk.gray('   Files archived:'), archiveResult.filesArchived);
  console.log(chalk.gray('   Total size archived:'), `${archiveResult.totalSize} bytes`);
  console.log(chalk.gray('   Archive directory:'), archiveResult.archiveDirectory);
  
  return archiveResult;
}

async function testBatchFileCleanup() {
  console.log(chalk.yellow('🧹 Testing batch file cleanup...'));
  
  const cleanupDirs = [
    resolve('./sample-data/batch-test'),
    resolve('./sample-data/batch-copy'),
    resolve('./sample-data/archive'),
    resolve('./sample-data/logs')
  ];
  
  /*DEBUG:START*/
  const cleanupResult = await debug.wrap('batch_cleanup_directories', async () => {
    const cleanupResults = [];
    
    for (const dirPath of cleanupDirs) {
      try {
        const files = await readdir(dirPath);
        let deletedFiles = 0;
        let deletedSize = 0;
        
        for (const fileName of files) {
          const filePath = join(dirPath, fileName);
          const stats = await stat(filePath);
          
          if (stats.isFile()) {
            deletedSize += stats.size;
            await unlink(filePath);
            deletedFiles++;
          }
        }
        
        // Remove empty directory
        await rmdir(dirPath);
        
        cleanupResults.push({
          directory: dirPath,
          filesDeleted: deletedFiles,
          sizeReclaimed: deletedSize,
          directoryRemoved: true
        });
        
      } catch (error) {
        cleanupResults.push({
          directory: dirPath,
          error: error.message,
          skipped: true
        });
      }
    }
    
    return {
      directoriesProcessed: cleanupResults.length,
      totalFilesDeleted: cleanupResults.reduce((sum, r) => sum + (r.filesDeleted || 0), 0),
      totalSizeReclaimed: cleanupResults.reduce((sum, r) => sum + (r.sizeReclaimed || 0), 0),
      operations: cleanupResults
    };
  }, {
    template: 'file',
    context: {
      operation: 'batch_cleanup',
      path: './sample-data/',
      options: { 
        removeEmptyDirs: true,
        recursive: true
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Batch file cleanup completed'));
  console.log(chalk.gray('   Directories processed:'), cleanupResult.directoriesProcessed);
  console.log(chalk.gray('   Files deleted:'), cleanupResult.totalFilesDeleted);
  console.log(chalk.gray('   Size reclaimed:'), `${cleanupResult.totalSizeReclaimed} bytes`);
  
  return cleanupResult;
}

async function testPerformanceBenchmark() {
  console.log(chalk.yellow('⚡ Testing file operations performance benchmark...'));
  
  const benchmarkDir = resolve('./sample-data/benchmark');
  
  /*DEBUG:START*/
  await debug.wrap('create_benchmark_directory', async () => {
    await mkdir(benchmarkDir, { recursive: true });
    return { created: true, path: benchmarkDir };
  }, {
    template: 'file',
    context: {
      operation: 'mkdir',
      path: benchmarkDir,
      options: { recursive: true }
    }
  });
  /*DEBUG:END*/
  
  /*DEBUG:START*/
  const benchmarkResult = await debug.wrap('file_operations_benchmark', async () => {
    const startTime = Date.now();
    const testFiles = [];
    
    // Create phase
    const createStart = Date.now();
    for (let i = 0; i < 100; i++) {
      const fileName = `benchmark-${i.toString().padStart(3, '0')}.txt`;
      const filePath = join(benchmarkDir, fileName);
      const content = `Benchmark file ${i} - ${new Date().toISOString()}`;
      
      await writeFile(filePath, content, 'utf8');
      testFiles.push({ name: fileName, path: filePath, content });
    }
    const createTime = Date.now() - createStart;
    
    // Read phase
    const readStart = Date.now();
    for (const file of testFiles) {
      await readFile(file.path, 'utf8');
    }
    const readTime = Date.now() - readStart;
    
    // Delete phase
    const deleteStart = Date.now();
    for (const file of testFiles) {
      await unlink(file.path);
    }
    const deleteTime = Date.now() - deleteStart;
    
    // Remove directory
    await rmdir(benchmarkDir);
    
    const totalTime = Date.now() - startTime;
    
    return {
      fileCount: testFiles.length,
      createTime,
      readTime,
      deleteTime,
      totalTime,
      avgCreateTime: createTime / testFiles.length,
      avgReadTime: readTime / testFiles.length,
      avgDeleteTime: deleteTime / testFiles.length,
      operationsPerSecond: (testFiles.length * 3) / (totalTime / 1000) // 3 ops per file
    };
  }, {
    template: 'file',
    context: {
      operation: 'benchmark',
      path: benchmarkDir,
      options: { 
        fileCount: 100,
        operations: ['create', 'read', 'delete']
      }
    }
  });
  /*DEBUG:END*/
  
  console.log(chalk.green('✅ Performance benchmark completed'));
  console.log(chalk.blue('📊 Benchmark Results:'));
  console.log(chalk.gray('   Files tested:'), benchmarkResult.fileCount);
  console.log(chalk.gray('   Create time:'), `${benchmarkResult.createTime}ms (avg: ${benchmarkResult.avgCreateTime.toFixed(2)}ms/file)`);
  console.log(chalk.gray('   Read time:'), `${benchmarkResult.readTime}ms (avg: ${benchmarkResult.avgReadTime.toFixed(2)}ms/file)`);
  console.log(chalk.gray('   Delete time:'), `${benchmarkResult.deleteTime}ms (avg: ${benchmarkResult.avgDeleteTime.toFixed(2)}ms/file)`);
  console.log(chalk.gray('   Total time:'), `${benchmarkResult.totalTime}ms`);
  console.log(chalk.gray('   Operations/sec:'), `${benchmarkResult.operationsPerSecond.toFixed(1)}`);
  
  return benchmarkResult;
}

async function runBatchFileOpsExamples() {
  console.log(chalk.blue('🚀 Starting File System Batch Operations Examples'));
  
  try {
    const { batchDir, createdFiles } = await testBatchFileCreation();
    const batchReadResult = await testBatchFileReading(batchDir);
    const { copyDir } = await testBatchFileCopying(batchDir);
    const renameResult = await testBatchFileRenaming(batchDir);
    const filterResult = await testFileFilteringAndSorting(batchDir);
    const archiveResult = await testBatchFileArchiving();
    const cleanupResult = await testBatchFileCleanup();
    const benchmarkResult = await testPerformanceBenchmark();
    
    console.log(chalk.green('✅ All file system batch operation examples completed successfully!'));
    console.log(chalk.blue('📊 Check ./debug/ directory for batch file operation debug data'));
    console.log(chalk.gray('📝 Debug data includes:'));
    console.log(chalk.gray('   - Batch file creation and deletion operations'));
    console.log(chalk.gray('   - File copying and moving operations'));
    console.log(chalk.gray('   - File renaming and organization'));
    console.log(chalk.gray('   - Directory management and cleanup'));
    console.log(chalk.gray('   - File filtering and sorting operations'));
    console.log(chalk.gray('   - Performance benchmarking metrics'));
    console.log(chalk.gray('   - File archiving and space management'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error in batch file operations examples:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBatchFileOpsExamples();
}