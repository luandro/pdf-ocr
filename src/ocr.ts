import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';
import fetch from 'node-fetch';

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

      // Create a temporary file from the image buffer
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-ocr-'));
      const tempFilePath = path.join(tempDir, `image-${uuidv4()}.png`);

      try {
        // Write the image buffer to a temporary file
        fs.writeFileSync(tempFilePath, imageBuffer);

        if (opts.verbose) {
          console.log(`Created temporary file: ${tempFilePath}`);
        }

        // Create a FormData object and append the file
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempFilePath), {
          filename: path.basename(tempFilePath),
          contentType: 'image/png',
        });

        // Upload the file to Mistral
        if (opts.verbose) {
          console.log('Uploading file to Mistral API...');
        }

        // Use node-fetch to upload the file directly
        const apiKey = process.env.MISTRAL_API_KEY;
        const response = await fetch('https://api.mistral.ai/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
          timeout: opts.timeout,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`File upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const uploadResponse = await response.json();

        if (opts.verbose) {
          console.log(`File uploaded successfully with ID: ${uploadResponse.id}`);
        }

        // Call Mistral OCR API with the file ID
        if (opts.verbose) {
          console.log('Processing OCR with uploaded file...');
        }

        const result = await mistral.ocr.process({
          model: 'Focus',
          document: {
            type: 'file_id',
            fileId: uploadResponse.id,
          },
        });

        // Return the extracted text
        // The text could be in either the 'content' or 'text' property depending on the API version
        const extractedText = result.content || result.text || '';

        if (opts.verbose) {
          console.log(`OCR successful on attempt ${attempt}`);
        }

        return extractedText;
      } finally {
        // Clean up temporary files
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          fs.rmdirSync(tempDir);

          if (opts.verbose) {
            console.log('Cleaned up temporary files');
          }
        } catch (cleanupError) {
          if (opts.verbose) {
            console.warn('Failed to clean up temporary files:', cleanupError);
          }
        }
      }
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
