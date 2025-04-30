import { PDFDocument } from 'pdf-lib';

/**
 * Merges multiple PDF buffers into a single PDF document
 * @param pdfBuffers - Array of PDF buffers to merge
 * @returns Buffer containing the merged PDF document
 * @throws Error if any of the PDFs are invalid
 */
export async function mergePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
  try {
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // If no PDFs to merge, return an empty PDF with one blank page
    if (pdfBuffers.length === 0) {
      // Add a blank page to match pdf-lib's default behavior
      mergedPdf.addPage();
      const pdfBytes = await mergedPdf.save();
      return Buffer.from(pdfBytes);
    }

    // Process each PDF buffer
    for (const pdfBuffer of pdfBuffers) {
      // Load the PDF document
      const pdf = await PDFDocument.load(pdfBuffer);

      // Get the number of pages
      const pageCount = pdf.getPageCount();

      // Copy all pages to the merged PDF
      if (pageCount > 0) {
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
    }

    // Save the merged PDF to a buffer
    const pdfBytes = await mergedPdf.save();

    return Buffer.from(pdfBytes);
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Invalid PDF: ${error.message}`);
    } else {
      throw new Error('Invalid PDF: Unknown error');
    }
  }
}
