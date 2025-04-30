import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Performs OCR on an image using Mistral API
 * @param imageBuffer - Buffer containing the image data
 * @returns Extracted text from the image
 * @throws Error if OCR fails or API key is missing
 */
export async function performOcr(imageBuffer: Buffer): Promise<string> {
  // Check if API key is set
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable is not set');
  }

  try {
    // Initialize Mistral client
    const mistral = new Mistral({
      apiKey: process.env.MISTRAL_API_KEY,
    });

    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64');

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
    return result.content || result.text || '';
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`OCR failed: ${error.message}`);
    } else {
      throw new Error('OCR failed: Unknown error');
    }
  }
}
