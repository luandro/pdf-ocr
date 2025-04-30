import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Performs OCR on an image using Mistral API
 * @param imageBuffer - Buffer containing the image data
 * @param options - OCR processing options
 * @returns Extracted text from the image
 * @throws Error if OCR fails or API key is missing
 */
export async function performOcr(
  imageBuffer: Buffer,
  options: OcrOptions = {}
): Promise<string> {
  // Set default options
  const opts = {
    maxRetries: options.maxRetries ?? 3,
    retryDelay: options.retryDelay ?? 1000,
    verbose: options.verbose ?? false,
    timeout: options.timeout ?? 30000,
  };

  // Check if API key is set
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable is not set');
  }

  // Initialize Mistral client with timeout
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(opts.timeout),
      });
    },
  });

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');

  // Implement retry logic
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      if (opts.verbose) {
        console.log(`OCR attempt ${attempt}/${opts.maxRetries}...`);
      }

      // Call Mistral OCR API
      const result = await mistral.ocr.process({
        model: 'Focus',
        document: {
          type: 'document_url',
          documentUrl: `data:image/png;base64,${base64Image}`,
        },
      });

      // Return the extracted text
      // The text could be in either the 'content' or 'text' property depending on the API version
      const extractedText = result.content || result.text || '';

      if (opts.verbose) {
        console.log(`OCR successful on attempt ${attempt}`);
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
  } else {
    throw new Error(`OCR failed after ${opts.maxRetries} attempts: Unknown error`);
  }
}
