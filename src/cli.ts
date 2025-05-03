#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { performOcr, OcrOptions } from './ocr';
import { textToPdf } from './textToPdf';
import { splitPdf } from './splitPdf';
import { mergePdfs } from './mergePdfs';
import { detectPageSplit, PageSplitDetectionOptions } from './pageSplitDetection';
import { splitPdfPage } from './splitPdfPage';
import { detectPageContent, PageContentDetectionOptions } from './pageContentDetection';
import { preserveOriginalPage } from './preserveOriginalPage';

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extended OCR options including page split detection and content detection
 */
export interface ExtendedOcrOptions extends OcrOptions {
  /** Whether to detect and split pages that contain two pages side by side */
  detectPageSplits?: boolean;
  /** Options for page split detection */
  pageSplitDetectionOptions?: PageSplitDetectionOptions;
  /** Whether to detect page content type (text, image, empty) */
  detectPageContent?: boolean;
  /** Options for page content detection */
  pageContentDetectionOptions?: PageContentDetectionOptions;
  /** Whether to preserve original image-only pages without OCR */
  preserveImagePages?: boolean;
  /** Whether to skip empty pages */
  skipEmptyPages?: boolean;
}

/**
 * Process a PDF file through the OCR pipeline
 * @param inputPath - Path to the input PDF file
 * @param outputPath - Path to save the output PDF file
 * @param concurrency - Number of pages to process in parallel (not used)
 * @param maxPages - Maximum number of pages to process
 * @param ocrOptions - Options for OCR processing
 * @param sleepTime - Time to sleep between processing pages in milliseconds
 */
export async function processPdf(
  inputPath: string,
  outputPath: string,
  concurrency: number = 2,
  maxPages?: number,
  ocrOptions?: ExtendedOcrOptions,
  sleepTime: number = 5000
): Promise<void> {
  try {
    // Read the input PDF
    const inputPdfBuffer = fs.readFileSync(inputPath);

    // Split the PDF into individual pages
    const pdfPages = await splitPdf(inputPdfBuffer, maxPages);

    if (ocrOptions?.verbose) {
      console.log(`PDF split into ${pdfPages.length} pages`);
    }

    // Process each page individually
    const processedPages: Buffer[] = [];

    // Track the text from the previous page for context
    let previousPageText: string | undefined;

    // Track processed page hashes to avoid duplicates
    const processedPageHashes = new Set<string>();

    for (let i = 0; i < pdfPages.length; i++) {
      if (ocrOptions?.verbose) {
        console.log(`Processing page ${i + 1}/${pdfPages.length}...`);
      }

      try {
        // Check if page needs splitting (if enabled)
        let pagesToProcess: Buffer[] = [pdfPages[i]];

        if (ocrOptions?.detectPageSplits) {
          if (ocrOptions?.verbose) {
            console.log(`Checking if page ${i + 1} needs splitting...`);
          }

          try {
            const splitDetectionResult = await detectPageSplit(pdfPages[i], {
              ...ocrOptions?.pageSplitDetectionOptions,
              verbose: ocrOptions?.verbose
            });

            if (splitDetectionResult.needsSplitting) {
              if (ocrOptions?.verbose) {
                console.log(`Page ${i + 1} needs splitting. Margin: ${splitDetectionResult.margin}`);
                if (splitDetectionResult.explanation) {
                  console.log(`Explanation: ${splitDetectionResult.explanation}`);
                }
              }

              // Split the page
              const splitPages = await splitPdfPage(pdfPages[i], {
                margin: splitDetectionResult.margin,
                verbose: ocrOptions?.verbose
              });

              if (splitPages.length > 0) {
                if (ocrOptions?.verbose) {
                  console.log(`Page ${i + 1} successfully split into ${splitPages.length} pages`);
                }
                pagesToProcess = splitPages;
              } else {
                if (ocrOptions?.verbose) {
                  console.log(`Failed to split page ${i + 1}, proceeding with original page`);
                }
              }
            } else if (ocrOptions?.verbose) {
              console.log(`Page ${i + 1} does not need splitting`);
              if (splitDetectionResult.explanation) {
                console.log(`Explanation: ${splitDetectionResult.explanation}`);
              }
            }
          } catch (splitError) {
            if (ocrOptions?.verbose) {
              console.error(`Error during page split detection: ${splitError instanceof Error ? splitError.message : String(splitError)}`);
              console.log(`Proceeding with original page ${i + 1}`);
            }
          }
        }

        // Process each page (original or split)
        for (let j = 0; j < pagesToProcess.length; j++) {
          if (ocrOptions?.verbose && pagesToProcess.length > 1) {
            console.log(`Processing split page ${j + 1}/${pagesToProcess.length} from original page ${i + 1}...`);
          }

          // Check page content type if enabled
          if (ocrOptions?.detectPageContent) {
            if (ocrOptions?.verbose) {
              console.log(`Detecting content type for page ${i + 1}${pagesToProcess.length > 1 ? `, split page ${j + 1}` : ''}...`);
            }

            try {
              const contentDetectionResult = await detectPageContent(pagesToProcess[j], {
                ...ocrOptions?.pageContentDetectionOptions,
                verbose: ocrOptions?.verbose
              });

              if (ocrOptions?.verbose) {
                console.log(`Content type detected: ${contentDetectionResult.contentType}`);
                if (contentDetectionResult.explanation) {
                  console.log(`Explanation: ${contentDetectionResult.explanation}`);
                }
              }

              // Handle empty pages
              if (contentDetectionResult.contentType === 'empty' && ocrOptions?.skipEmptyPages) {
                if (ocrOptions?.verbose) {
                  console.log(`Skipping empty page ${i + 1}${pagesToProcess.length > 1 ? `, split page ${j + 1}` : ''}`);
                }
                continue; // Skip this page and move to the next one
              }

              // Handle image-only pages
              if (contentDetectionResult.contentType === 'image' && ocrOptions?.preserveImagePages) {
                if (ocrOptions?.verbose) {
                  console.log(`Preserving original image page ${i + 1}${pagesToProcess.length > 1 ? `, split page ${j + 1}` : ''} without OCR`);
                }

                // Preserve the original page
                const preservedPage = await preserveOriginalPage(pagesToProcess[j], {
                  verbose: ocrOptions?.verbose
                });

                // Check for duplicate content using the buffer hash
                const pageHash = Buffer.from(preservedPage).toString('base64');
                if (processedPageHashes.has(pageHash)) {
                  if (ocrOptions?.verbose) {
                    console.log(`Skipping duplicate image page ${i + 1}${pagesToProcess.length > 1 ? `, split page ${j + 1}` : ''}`);
                  }
                  continue;
                }

                // Add the hash to the set of processed pages
                processedPageHashes.add(pageHash);

                // Add the preserved page to the result
                processedPages.push(preservedPage);
                continue; // Skip OCR for this page and move to the next one
              }
            } catch (contentError) {
              if (ocrOptions?.verbose) {
                console.error(`Error during page content detection: ${contentError instanceof Error ? contentError.message : String(contentError)}`);
                console.log(`Proceeding with OCR for page ${i + 1}${pagesToProcess.length > 1 ? `, split page ${j + 1}` : ''}`);
              }
            }
          }

          // Perform OCR on the current page, passing the previous page's text for context
          const ocrOptions_withContext = {
            ...ocrOptions,
            previousPageText: previousPageText
          };

          const ocrText = await performOcr(pagesToProcess[j], ocrOptions_withContext);

          // Store this page's text to use as context for the next page
          previousPageText = ocrText;

          // Skip empty text
          if (ocrText.trim().length === 0) {
            if (ocrOptions?.verbose) {
              console.log(`Skipping empty text result for page ${i + 1}${pagesToProcess.length > 1 ? `, split page ${j + 1}` : ''}`);
            }
            continue;
          }

          // Check for duplicate content
          const contentHash = Buffer.from(ocrText).toString('base64');
          if (processedPageHashes.has(contentHash)) {
            if (ocrOptions?.verbose) {
              console.log(`Skipping duplicate content for page ${i + 1}${pagesToProcess.length > 1 ? `, split page ${j + 1}` : ''}`);
            }
            continue;
          }

          // Add the hash to the set of processed pages
          processedPageHashes.add(contentHash);

          // Convert OCR text back to PDF
          const pdfBuffer = await textToPdf(ocrText);

          // Add the processed page to the result
          processedPages.push(pdfBuffer);

          // Sleep between split pages (except after the last one)
          if (j < pagesToProcess.length - 1) {
            if (ocrOptions?.verbose) {
              console.log(`Sleeping for ${sleepTime}ms before processing next split page...`);
            }
            await sleep(sleepTime);
          }
        }

        if (ocrOptions?.verbose) {
          console.log(`Page ${i + 1} processed successfully`);
        }

        // Sleep between pages (except after the last page)
        if (i < pdfPages.length - 1) {
          if (ocrOptions?.verbose) {
            console.log(`Sleeping for ${sleepTime}ms before processing next page...`);
          }
          await sleep(sleepTime);
        }
      } catch (error) {
        if (ocrOptions?.verbose) {
          console.error(`Error processing page ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
        throw error;
      }
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
    .description('OCR a PDF file using Mistral API with optional LLM verification')
    .version(require('../package.json').version)
    .requiredOption('-i, --input <path>', 'Input PDF file path')
    .requiredOption('-o, --output <path>', 'Output PDF file path')
    .option('-c, --concurrency <number>', 'Number of pages to process in parallel', (value) => parseInt(value, 10), 2)
    .option('-m, --max-pages <number>', 'Maximum number of pages to process', (value) => parseInt(value, 10))
    .option('-r, --retries <number>', 'Maximum number of OCR retry attempts', (value) => parseInt(value, 10), 3)
    .option('-d, --retry-delay <number>', 'Delay between OCR retries in milliseconds', (value) => parseInt(value, 10), 1000)
    .option('-t, --timeout <number>', 'Timeout for OCR API requests in milliseconds', (value) => parseInt(value, 10), 30000)
    .option('-s, --sleep <number>', 'Time to sleep between processing pages in milliseconds', (value) => parseInt(value, 10), 5000)
    .option('-v, --verbose', 'Enable verbose logging for OCR process')
    .option('--verify', 'Verify and improve OCR text using LLM')
    .option('--detect-splits', 'Detect and split pages that contain two pages side by side')
    .option('--detect-content', 'Detect page content type (text, image, empty)')
    .option('--preserve-images', 'Preserve original image-only pages without OCR')
    .option('--skip-empty', 'Skip empty pages')
    .option('--max-tokens <number>', 'Maximum number of tokens for LLM operations', (value) => parseInt(value, 10), 1000)
    .option('--temperature <number>', 'Temperature for LLM operations', (value) => parseFloat(value), 0.7)
    .option('--top-p <number>', 'Top-p for LLM operations', (value) => parseFloat(value), 0.9)
    .action(async (options) => {
      try {
        // Resolve paths to absolute paths
        const inputPath = path.resolve(options.input);
        const outputPath = path.resolve(options.output);

        // Create OCR options from CLI options
        const ocrOptions: ExtendedOcrOptions = {
          maxRetries: options.retries,
          retryDelay: options.retryDelay,
          timeout: options.timeout,
          verbose: options.verbose || false,
          verifyContent: options.verify,
          detectPageSplits: options.detectSplits,
          detectPageContent: options.detectContent,
          preserveImagePages: options.preserveImages,
          skipEmptyPages: options.skipEmpty,
          contentVerificationOptions: {
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            topP: options.topP,
            verbose: options.verbose || false
          },
          pageSplitDetectionOptions: {
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            topP: options.topP,
            verbose: options.verbose || false
          },
          pageContentDetectionOptions: {
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            topP: options.topP,
            verbose: options.verbose || false
          }
        };

        console.log(`Processing ${inputPath}...`);

        // Process the PDF
        await processPdf(
          inputPath,
          outputPath,
          options.concurrency,
          options.maxPages,
          ocrOptions,
          options.sleep
        );

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
