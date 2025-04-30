import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

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

      // Step 1: Upload the PDF file
      if (opts.verbose) {
        console.log('Uploading PDF to Mistral API...');
      }

      const uploadedPdf = await mistral.files.upload({
        file: {
          fileName: `document-${uuidv4()}.pdf`,
          content: pdfBuffer,
        },
      });

      if (opts.verbose) {
        console.log(`PDF uploaded successfully with ID: ${uploadedPdf.id}`);
      }

      // Step 2: Get a signed URL for the uploaded file
      if (opts.verbose) {
        console.log('Getting signed URL for the uploaded PDF...');
      }

      const signedUrl = await mistral.files.getSignedUrl({
        fileId: uploadedPdf.id,
      });

      if (opts.verbose) {
        console.log('Signed URL obtained successfully');
      }

      // Step 3: Process the PDF with OCR
      if (opts.verbose) {
        console.log('Processing OCR with uploaded PDF...');
      }

      const result = await mistral.ocr.process({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          documentUrl: signedUrl.url,
        },
      });

      // Return the extracted text
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
