#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// Configuration
const inputFile = path.resolve(__dirname, 'sample.pdf');
const outputFile = path.resolve(__dirname, 'multi-page-ocr.pdf');
const multiPageFile = path.resolve(__dirname, 'multi-page.pdf');
const numPages = 3; // Create a PDF with 3 pages
const maxPages = 3; // Process all pages
const sleepTime = 5000; // 5 seconds between pages
const verbose = true;

// Create a multi-page PDF from the sample PDF
async function createMultiPagePdf() {
  console.log(`Creating a ${numPages}-page PDF...`);

  // Read the sample PDF
  const samplePdfBytes = fs.readFileSync(inputFile);

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Load the sample PDF
  const samplePdf = await PDFDocument.load(samplePdfBytes);

  // Copy the first page of the sample PDF multiple times
  for (let i = 0; i < numPages; i++) {
    // Copy the first page for each iteration to avoid reference issues
    const [copiedPage] = await pdfDoc.copyPages(samplePdf, [0]);
    pdfDoc.addPage(copiedPage);
  }

  // Save the new PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(multiPageFile, pdfBytes);

  console.log(`Created multi-page PDF: ${multiPageFile}`);
}

// Main function
async function main() {
  // Create a multi-page PDF
  await createMultiPagePdf();

  // Verify the input file exists
  if (!fs.existsSync(multiPageFile)) {
    console.error(`Input file not found: ${multiPageFile}`);
    process.exit(1);
  }

  // Remove the output file if it exists
  if (fs.existsSync(outputFile)) {
    console.log(`Removing existing output file: ${outputFile}`);
    fs.unlinkSync(outputFile);
  }

  console.log('Starting OCR process...');
  console.log(`Input file: ${multiPageFile}`);
  console.log(`Output file: ${outputFile}`);
  console.log(`Max pages: ${maxPages}`);
  console.log(`Sleep time: ${sleepTime}ms`);

  try {
    // Build the command
    const command = `node dist/cli.js --input "${multiPageFile}" --output "${outputFile}" --max-pages ${maxPages} --sleep ${sleepTime} ${verbose ? '--verbose' : ''}`;

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
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
