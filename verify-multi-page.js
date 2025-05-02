#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const inputFile = path.resolve(__dirname, 'multi-page-ocr.pdf');
const outputFile = path.resolve(__dirname, 'multi-page-ocr.txt');

// Verify the input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log(`Verifying OCR output for ${inputFile}...`);

try {
  // Extract text from the OCR PDF using uvx
  console.log('\nExtracting text using uvx...');
  execSync(`uvx --with numpy pdftext --out_path ${outputFile} ${inputFile}`, { stdio: 'inherit' });
  
  // Read the extracted text
  if (fs.existsSync(outputFile)) {
    const ocrText = fs.readFileSync(outputFile, 'utf8');
    console.log('\nExtracted OCR text:');
    console.log('-------------------');
    console.log(ocrText.substring(0, 500) + '...');
    console.log('-------------------');
    
    if (ocrText.trim().length === 0) {
      console.warn('Warning: The OCR PDF appears to be blank or contains no extractable text.');
    } else {
      console.log(`OCR text extraction successful! Total characters: ${ocrText.length}`);
    }
  } else {
    console.warn('Warning: OCR text file was not created by uvx command.');
  }
} catch (error) {
  console.error('Error during verification:');
  console.error(error.message);
  process.exit(1);
}
