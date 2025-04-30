#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const inputFile = path.resolve(__dirname, 'sample.pdf');
const outputFile = path.resolve(__dirname, 'sample-ocr.pdf');
const maxPages = 3; // Process only the first 3 pages for testing
const sleepTime = 10000; // 10 seconds between pages
const verbose = true;

// Verify the input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

// Remove the output file if it exists
if (fs.existsSync(outputFile)) {
  console.log(`Removing existing output file: ${outputFile}`);
  fs.unlinkSync(outputFile);
}

console.log('Starting OCR process...');
console.log(`Input file: ${inputFile}`);
console.log(`Output file: ${outputFile}`);
console.log(`Max pages: ${maxPages}`);
console.log(`Sleep time: ${sleepTime}ms`);

try {
  // Build the command
  const command = `node dist/cli.js --input "${inputFile}" --output "${outputFile}" --max-pages ${maxPages} --sleep ${sleepTime} ${verbose ? '--verbose' : ''}`;
  
  console.log(`\nExecuting command: ${command}\n`);
  
  // Execute the command
  const startTime = Date.now();
  execSync(command, { stdio: 'inherit' });
  const endTime = Date.now();
  
  // Calculate execution time
  const executionTime = (endTime - startTime) / 1000;
  
  console.log(`\nOCR process completed in ${executionTime.toFixed(2)} seconds`);
  
  // Verify the output file exists
  if (fs.existsSync(outputFile)) {
    const stats = fs.statSync(outputFile);
    console.log(`Output file size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log('Test completed successfully!');
  } else {
    console.error('Output file was not created!');
    process.exit(1);
  }
} catch (error) {
  console.error('Error during OCR process:');
  console.error(error.message);
  process.exit(1);
}
