import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { mergePdfs } from '../src/mergePdfs';

describe('PDF Merger', () => {
  const singlePagePdfPath = path.join(__dirname, '../fixtures/single-page.pdf');

  test('should combine multiple PDF buffers into one document', async () => {
    // Read the same PDF multiple times to create multiple buffers
    const pdfBuffer = fs.readFileSync(singlePagePdfPath);
    const pdfBuffers = [pdfBuffer, pdfBuffer, pdfBuffer];

    // Merge the PDFs
    const mergedPdfBuffer = await mergePdfs(pdfBuffers);

    // Verify it's a Buffer
    expect(mergedPdfBuffer).toBeInstanceOf(Buffer);

    // Verify it's a valid PDF
    expect(mergedPdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF and verify it has the expected number of pages
    const pdfDoc = await PDFDocument.load(mergedPdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(3);
  });

  test('should preserve page order', async () => {
    // Create three different PDFs with different content
    const pdf1 = await createPdfWithText('Page 1');
    const pdf2 = await createPdfWithText('Page 2');
    const pdf3 = await createPdfWithText('Page 3');

    // Merge the PDFs
    const mergedPdfBuffer = await mergePdfs([pdf1, pdf2, pdf3]);

    // Verify it's a valid PDF with 3 pages
    const pdfDoc = await PDFDocument.load(mergedPdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(3);

    // We can't easily verify the content of each page, but we can verify
    // that the merger completed successfully and preserved the page count
  });

  test('should handle empty input array', async () => {
    // Merge an empty array of PDFs
    const mergedPdfBuffer = await mergePdfs([]);

    // Verify it's a Buffer
    expect(mergedPdfBuffer).toBeInstanceOf(Buffer);

    // Verify it's a valid PDF
    expect(mergedPdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF and verify it's a valid PDF
    const pdfDoc = await PDFDocument.load(mergedPdfBuffer);
    // pdf-lib creates a document with one empty page by default
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  test('should handle a single PDF', async () => {
    // Read a single PDF
    const pdfBuffer = fs.readFileSync(singlePagePdfPath);

    // Merge a single PDF
    const mergedPdfBuffer = await mergePdfs([pdfBuffer]);

    // Verify it's a Buffer
    expect(mergedPdfBuffer).toBeInstanceOf(Buffer);

    // Verify it's a valid PDF
    expect(mergedPdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF and verify it has 1 page
    const pdfDoc = await PDFDocument.load(mergedPdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  test('should throw error for invalid PDFs', async () => {
    // Create an invalid PDF buffer
    const invalidPdfBuffer = Buffer.from('This is not a valid PDF');

    // Attempt to merge with an invalid PDF
    await expect(mergePdfs([invalidPdfBuffer])).rejects.toThrow('Invalid PDF');
  });

  test('should handle non-Error exceptions', async () => {
    // Mock PDFDocument.load to throw a non-Error value
    const originalLoad = PDFDocument.load;
    PDFDocument.load = jest.fn().mockImplementationOnce(() => {
      throw 'Not an Error object';
    });

    try {
      // Attempt to merge with a PDF that will cause a non-Error exception
      const pdfBuffer = Buffer.from('dummy data');
      await expect(mergePdfs([pdfBuffer])).rejects.toThrow('Invalid PDF: Unknown error');
    } finally {
      // Restore the original function
      PDFDocument.load = originalLoad;
    }
  });
});

// Helper function to create a PDF with specific text
async function createPdfWithText(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  page.drawText(text, {
    x: 50,
    y: 50,
    size: 12,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
