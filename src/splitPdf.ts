import { PDFDocument } from 'pdf-lib';

/**
 * Splits a PDF buffer into individual pages
 * @param pdfBuffer - Buffer containing the PDF data
 * @param maxPages - Maximum number of pages to extract (optional)
 * @returns Array of Buffers, each containing a single page PDF
 * @throws Error if the PDF is invalid
 */
export async function splitPdf(pdfBuffer: Buffer, maxPages?: number): Promise<Buffer[]> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Get the total number of pages
    const pageCount = pdfDoc.getPageCount();
    
    // Determine how many pages to process
    const pagesToProcess = maxPages ? Math.min(pageCount, maxPages) : pageCount;
    
    // Create an array to store the individual page buffers
    const pageBuffers: Buffer[] = [];
    
    // Process each page
    for (let i = 0; i < pagesToProcess; i++) {
      // Create a new document for this page
      const newPdfDoc = await PDFDocument.create();
      
      // Copy the page from the original document
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
      newPdfDoc.addPage(copiedPage);
      
      // Save the new document to a buffer
      const newPdfBytes = await newPdfDoc.save();
      
      // Convert to Buffer and add to the array
      pageBuffers.push(Buffer.from(newPdfBytes));
    }
    
    return pageBuffers;
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Invalid PDF: ${error.message}`);
    } else {
      throw new Error('Invalid PDF: Unknown error');
    }
  }
}
