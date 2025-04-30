import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fromBuffer } from 'pdf2pic';
import { v4 as uuidv4 } from 'uuid';

/**
 * Renders a single-page PDF to a PNG image
 * @param pdfBuffer - Buffer containing a single-page PDF
 * @param resolution - DPI resolution for rendering (default: 150)
 * @returns Buffer containing the PNG image
 * @throws Error if the PDF has multiple pages or is invalid
 */
export async function renderPdfToPng(pdfBuffer: Buffer, resolution: number = 150): Promise<Buffer> {
  try {
    // Load the PDF document to check page count
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Ensure it's a single-page PDF
    if (pdfDoc.getPageCount() !== 1) {
      throw new Error('Input PDF must be a single page');
    }

    // Create a temporary directory
    const tempDir = path.join(os.tmpdir(), `pdf-ocr-${uuidv4()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Configure pdf2pic
    const pdf2picOptions = {
      density: resolution,
      savePath: tempDir,
      format: "png",
      width: 2000, // Max width
      height: 2000 // Max height
    };

    // Convert PDF to PNG
    const converter = fromBuffer(pdfBuffer, pdf2picOptions);
    const result = await converter(1); // Convert page 1

    if (!result || !result.path) {
      throw new Error('Failed to render PDF to PNG');
    }

    // Read the PNG file
    const pngBuffer = fs.readFileSync(result.path);

    // Clean up temporary files
    try {
      fs.unlinkSync(result.path);
      fs.rmdirSync(tempDir);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary files:', cleanupError);
    }

    // Return the PNG buffer
    return pngBuffer;
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      if (error.message === 'Input PDF must be a single page') {
        throw error; // Re-throw our own error
      }
      throw new Error(`Invalid PDF: ${error.message}`);
    } else {
      throw new Error('Invalid PDF: Unknown error');
    }
  }
}
