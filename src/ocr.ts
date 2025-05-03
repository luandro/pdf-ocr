import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import types for content verification
import type { ContentVerificationOptions } from './contentVerification';

/**
 * Options for OCR processing
 */
export interface OcrOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Whether to enable verbose logging (default: false) */
  verbose?: boolean;
  /** Timeout for the API request in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to verify and improve OCR text using LLM (default: false) */
  verifyContent?: boolean;
  /** Options for content verification */
  contentVerificationOptions?: ContentVerificationOptions;
  /** Text from the previous page to provide context for content verification */
  previousPageText?: string;
}

/**
 * OCR page result
 */
interface OcrPage {
  /** Page index */
  index: number;
  /** Markdown text extracted from the page */
  markdown?: string;
  /** Images extracted from the page */
  images?: any[];
  /** Page dimensions */
  dimensions?: {
    /** DPI of the page */
    dpi: number;
    /** Height of the page in pixels */
    height: number;
    /** Width of the page in pixels */
    width: number;
  };
}

/**
 * OCR response from Mistral API
 */
interface OcrResponse {
  /** Pages processed by OCR */
  pages?: OcrPage[];
  /** Model used for OCR */
  model?: string;
  /** Usage information */
  usageInfo?: {
    /** Number of pages processed */
    pagesProcessed: number;
    /** Size of the document in bytes */
    docSizeBytes: number;
  };
  /** Legacy content field */
  content?: string;
  /** Legacy text field */
  text?: string;
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Performs OCR on a PDF using Mistral API
 * @param pdfBuffer - Buffer containing the PDF data
 * @param options - OCR processing options
 * @returns Extracted text from the PDF
 * @throws Error if OCR fails or API key is missing
 */
export async function performOcr(
  pdfBuffer: Buffer,
  options: OcrOptions = {}
): Promise<string> {
  // Set default options
  const opts = {
    maxRetries: options.maxRetries ?? 3,
    retryDelay: options.retryDelay ?? 1000,
    verbose: options.verbose ?? false,
    timeout: options.timeout ?? 30000,
    verifyContent: options.verifyContent ?? false,
    contentVerificationOptions: options.contentVerificationOptions ?? {},
  };

  // Check if API key is set
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable is not set');
  }

  // Initialize Mistral client
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  // Implement retry logic
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      if (opts.verbose) {
        console.log(`OCR attempt ${attempt}/${opts.maxRetries}...`);
      }

      // Convert the PDF buffer to base64
      const base64Pdf = pdfBuffer.toString('base64');

      // Use the OCR API directly with the base64 encoded PDF
      if (opts.verbose) {
        console.log('Processing OCR with base64 encoded PDF...');
      }

      const result = await mistral.ocr.process({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          documentUrl: `data:application/pdf;base64,${base64Pdf}`,
        },
      }) as unknown as OcrResponse;

      // Extract text from the result
      let extractedText = '';

      // Check if the result has pages with markdown content
      if (result.pages && Array.isArray(result.pages)) {
        // Concatenate markdown from all pages
        extractedText = result.pages
          .map(page => page.markdown || '')
          .filter(text => text.length > 0)
          .join('\n\n');
      } else {
        // Fallback to content or text fields
        extractedText = result.content || result.text || '';
      }

      if (opts.verbose) {
        console.log(`OCR successful on attempt ${attempt}`);
        console.log('OCR result structure:', JSON.stringify(result, null, 2));
        console.log('Extracted text length:', extractedText.length);
        if (extractedText.length > 0) {
          console.log('First 200 characters of extracted text:', extractedText.substring(0, 200));
        } else {
          console.log('No text was extracted from the PDF');
        }
      }

      // Filter out markdown image references
      extractedText = extractedText.replace(/!\[.*?\]\(.*?\)/g, '');

      // Clean up any empty lines created by removing image references
      extractedText = extractedText.replace(/\n\s*\n/g, '\n\n').trim();

      if (opts.verbose && extractedText.length > 0) {
        console.log('After filtering image references, text length:', extractedText.length);
        console.log('First 200 characters after filtering:', extractedText.substring(0, 200));
      }

      // Check if the extracted text is meaningful before verification
      const hasOnlyMetadata = (extractedText.includes("image") &&
                             (extractedText.includes("reference") ||
                              extractedText.includes("metadata") ||
                              extractedText.includes("no text"))) ||
                              /!\[.*?\]\(.*?\)/.test(extractedText);

      // If the text contains only metadata and verification is enabled, log this information
      if (opts.verifyContent && hasOnlyMetadata && opts.verbose) {
        console.log('Skipping content verification for metadata-only or empty content');
        // Return empty string for metadata-only content
        return "";
      }

      // Verify and improve the extracted text if enabled and the text is meaningful
      if (opts.verifyContent && extractedText.length > 0) {
        if (opts.verbose) {
          console.log('Verifying and improving OCR text...');
        }

        try {
          // Dynamically import the content verification module
          const { verifyContent } = await import('./contentVerification');

          // Pass the verbose option from OCR options to content verification options
          const contentOpts = {
            ...opts.contentVerificationOptions,
            verbose: opts.verbose,
          };

          // Verify and improve the extracted text, passing previous page text if available
          const verifiedText = await verifyContent(extractedText, contentOpts, options.previousPageText);

          if (opts.verbose) {
            console.log('Content verification complete');
            if (verifiedText !== extractedText) {
              console.log('Text was improved by content verification');
            } else {
              console.log('No changes were made by content verification');
            }
          }

          return verifiedText;
        } catch (verifyError) {
          // If content verification fails, log the error and return the original text
          if (opts.verbose) {
            console.error('Content verification failed:',
              verifyError instanceof Error ? verifyError.message : String(verifyError));
            console.log('Returning original OCR text');
          }
        }
      }

      return extractedText;

    } catch (error) {
      lastError = error instanceof Error
        ? error
        : new Error('Unknown error');

      if (opts.verbose) {
        console.error(`OCR attempt ${attempt} failed: ${lastError.message}`);
      }

      // If this is not the last attempt, wait before retrying
      if (attempt < opts.maxRetries) {
        // Exponential backoff: increase delay with each retry
        const delay = opts.retryDelay * Math.pow(2, attempt - 1);
        if (opts.verbose) {
          console.log(`Retrying in ${delay}ms...`);
        }
        await sleep(delay);
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  if (lastError) {
    throw new Error(`OCR failed after ${opts.maxRetries} attempts: ${lastError.message}`);
  }

  throw new Error(`OCR failed after ${opts.maxRetries} attempts: Unknown error`);
}
