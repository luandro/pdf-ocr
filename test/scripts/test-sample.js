#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const inputFile = path.resolve(__dirname, '../../fixtures/simple.pdf');
const outputDir = path.resolve(__dirname, '../output');
const outputFile = path.resolve(outputDir, 'sample-ocr.pdf');
const maxPages = 3; // Process only the first 3 pages for testing
const sleepTime = 10000; // 10 seconds between pages
const verbose = true;

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

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

    // Extract text from the OCR PDF using uvx
    console.log('\nExtracting text from OCR PDF using uvx...');
    const ocrTextFile = path.resolve(outputDir, 'ocr.txt');
    try {
      execSync(`uvx --with numpy pdftext --out_path ${ocrTextFile} ${outputFile}`, { stdio: 'inherit' });

      // Read the extracted text
      if (fs.existsSync(ocrTextFile)) {
        const ocrText = fs.readFileSync(ocrTextFile, 'utf8');
        console.log('\nExtracted OCR text:');
        console.log('-------------------');
        console.log(ocrText || '(No text extracted)');
        console.log('-------------------');

        if (ocrText.trim().length === 0) {
          console.warn('Warning: The OCR PDF appears to be blank or contains no extractable text.');
        } else {
          console.log('OCR text extraction successful!');
        }
      } else {
        console.warn('Warning: OCR text file was not created by uvx command.');
      }
    } catch (uvxError) {
      console.warn('Warning: Failed to extract text using uvx command:');
      console.warn(uvxError.message);
    }

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
