#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { splitPdf } from './splitPdf';
import { renderPdfToPng } from './renderPdfToPng';
import { performOcr } from './ocr';
import { textToPdf } from './textToPdf';
import { mergePdfs } from './mergePdfs';

/**
 * Process a PDF file through the OCR pipeline
 * @param inputPath - Path to the input PDF file
 * @param outputPath - Path to save the output PDF file
 * @param concurrency - Number of pages to process in parallel
 * @param maxPages - Maximum number of pages to process
 */
export async function processPdf(
  inputPath: string,
  outputPath: string,
  concurrency: number = 2,
  maxPages?: number
): Promise<void> {
  try {
    // Read the input PDF
    const inputPdfBuffer = fs.readFileSync(inputPath);
    
    // Split the PDF into individual pages
    const pdfPages = await splitPdf(inputPdfBuffer, maxPages);
    
    // Process pages in batches based on concurrency
    const processedPages: Buffer[] = [];
    
    // Process pages in batches
    for (let i = 0; i < pdfPages.length; i += concurrency) {
      const batch = pdfPages.slice(i, i + concurrency);
      
      // Process each page in the batch concurrently
      const batchPromises = batch.map(async (pageBuffer) => {
        // Convert PDF page to PNG
        const pngBuffer = await renderPdfToPng(pageBuffer);
        
        // Perform OCR on the PNG
        const ocrText = await performOcr(pngBuffer);
        
        // Convert OCR text back to PDF
        return textToPdf(ocrText);
      });
      
      // Wait for all pages in the batch to be processed
      const batchResults = await Promise.all(batchPromises);
      
      // Add the processed pages to the result
      processedPages.push(...batchResults);
    }
    
    // Merge the processed pages back into a single PDF
    const outputPdfBuffer = await mergePdfs(processedPages);
    
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
    .action(async (options) => {
      try {
        // Resolve paths to absolute paths
        const inputPath = path.resolve(options.input);
        const outputPath = path.resolve(options.output);
        
        console.log(`Processing ${inputPath}...`);
        
        // Process the PDF
        await processPdf(inputPath, outputPath, options.concurrency, options.maxPages);
        
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
