#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const inputFile = process.argv[2] || path.resolve(__dirname, '../../fixtures/double-page-sample.pdf');
const outputDir = path.resolve(__dirname, '../output');
const outputFile = path.resolve(outputDir, 'split-page-ocr.pdf');
const maxPages = 1; // Process just one page for testing
const sleepTime = 1000; // 1 second between pages
const verbose = true;

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  console.error('Please provide a valid PDF file path as the first argument');
  console.error('Example: node test-page-split.js path/to/double-page.pdf');
  process.exit(1);
}

// Main function
async function main() {
  console.log('Starting page split detection test...');
  console.log(`Input file: ${inputFile}`);
  console.log(`Output file: ${outputFile}`);
  console.log(`Max pages: ${maxPages}`);
  console.log(`Sleep time: ${sleepTime}ms`);

  try {
    // Build the command
    const command = `node dist/cli.js --input "${inputFile}" --output "${outputFile}" --max-pages ${maxPages} --sleep ${sleepTime} --detect-splits ${verbose ? '--verbose' : ''}`;

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
      console.log(`Output file saved to: ${outputFile}`);
    } else {
      console.error('Output file was not created');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error executing OCR command:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
