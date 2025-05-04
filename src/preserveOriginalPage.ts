import { PDFDocument } from 'pdf-lib';

/**
 * Options for preserving the original PDF page
 */
export interface PreserveOriginalPageOptions {
  /** Whether to enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Helper function for verbose logging
 */
function logVerbose(verbose: boolean, ...args: any[]): void {
  if (verbose) {
    console.log(...args);
  }
}

/**
 * Preserves the original PDF page without OCR processing
 * This is useful for image-only pages that don't need OCR
 * @param pdfBuffer - Buffer containing a single PDF page
 * @param options - Options for preserving the original page
 * @returns Buffer containing the preserved page
 */
export async function preserveOriginalPage(
  pdfBuffer: Buffer,
  options: PreserveOriginalPageOptions = {}
): Promise<Buffer> {
  const opts = {
    verbose: options.verbose ?? false
  };

  try {
    logVerbose(opts.verbose, 'Preserving original PDF page without OCR processing...');
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Save the document to a buffer
    const pdfBytes = await pdfDoc.save();
    
    logVerbose(opts.verbose, 'Original page preserved successfully');
    
    // Return the buffer
    return Buffer.from(pdfBytes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logVerbose(opts.verbose, `Failed to preserve original page: ${errorMessage}`);
    throw new Error(`Failed to preserve original page: ${errorMessage}`);
  }
}
