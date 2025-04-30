#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { performOcr, OcrOptions } from './ocr';
import { textToPdf } from './textToPdf';

/**
 * Process a PDF file through the OCR pipeline
 * @param inputPath - Path to the input PDF file
 * @param outputPath - Path to save the output PDF file
 * @param concurrency - Number of pages to process in parallel (not used with direct PDF upload)
 * @param maxPages - Maximum number of pages to process (not used with direct PDF upload)
 * @param ocrOptions - Options for OCR processing
 */
export async function processPdf(
  inputPath: string,
  outputPath: string,
  concurrency: number = 2,
  maxPages?: number,
  ocrOptions?: OcrOptions
): Promise<void> {
  try {
    // Read the input PDF
    const inputPdfBuffer = fs.readFileSync(inputPath);

    // Perform OCR directly on the PDF
    const ocrText = await performOcr(inputPdfBuffer, ocrOptions);

    // Convert OCR text back to PDF
    const outputPdfBuffer = await textToPdf(ocrText);

    // Write the output PDF
    fs.writeFileSync(outputPath, outputPdfBuffer);
  } catch (error) {
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

/**
 * Create the CLI program
 * @returns The commander program instance
 */
export function createCli(): Command {
  const program = new Command();

  program
    .name('pdf-ocr')
    .description('OCR a PDF file using Mistral API')
    .version('1.0.0')
    .requiredOption('-i, --input <path>', 'Input PDF file path')
    .requiredOption('-o, --output <path>', 'Output PDF file path')
    .option('-c, --concurrency <number>', 'Number of pages to process in parallel', (value) => parseInt(value, 10), 2)
    .option('-m, --max-pages <number>', 'Maximum number of pages to process', (value) => parseInt(value, 10))
    .option('-r, --retries <number>', 'Maximum number of OCR retry attempts', (value) => parseInt(value, 10), 3)
    .option('-d, --retry-delay <number>', 'Delay between OCR retries in milliseconds', (value) => parseInt(value, 10), 1000)
    .option('-t, --timeout <number>', 'Timeout for OCR API requests in milliseconds', (value) => parseInt(value, 10), 30000)
    .option('-v, --verbose', 'Enable verbose logging for OCR process')
    .action(async (options) => {
      try {
        // Resolve paths to absolute paths
        const inputPath = path.resolve(options.input);
        const outputPath = path.resolve(options.output);

        // Create OCR options from CLI options
        const ocrOptions: OcrOptions = {
          maxRetries: options.retries,
          retryDelay: options.retryDelay,
          timeout: options.timeout,
          verbose: options.verbose || false
        };

        console.log(`Processing ${inputPath}...`);

        // Process the PDF
        await processPdf(inputPath, outputPath, options.concurrency, options.maxPages, ocrOptions);

        console.log(`OCR complete! Output saved to ${outputPath}`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return program;
}

// Only run the CLI if this file is executed directly
if (require.main === module) {
  const program = createCli();
  program.parse(process.argv);
}
