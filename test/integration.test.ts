import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { processPdf } from '../src/cli';

// Mock the OCR module to avoid actual API calls
jest.mock('../src/ocr');
import { performOcr } from '../src/ocr';

describe('End-to-end processing', () => {
  const singlePagePdfPath = path.join(__dirname, '../fixtures/single-page.pdf');
  const outputPdfPath = path.join(__dirname, '../fixtures/output.pdf');

  beforeEach(() => {
    // Mock the OCR function to return a fixed text
    (performOcr as jest.Mock).mockResolvedValue('This is OCR text from the test fixture');

    // Clean up any previous output file
    if (fs.existsSync(outputPdfPath)) {
      fs.unlinkSync(outputPdfPath);
    }
  });

  afterEach(() => {
    // Clean up the output file after each test
    if (fs.existsSync(outputPdfPath)) {
      fs.unlinkSync(outputPdfPath);
    }
  });

  test('should process a sample PDF end-to-end', async () => {
    // Process the PDF
    await processPdf(singlePagePdfPath, outputPdfPath, 2);

    // Verify the output file exists
    expect(fs.existsSync(outputPdfPath)).toBe(true);

    // Verify it's a valid PDF
    const pdfBuffer = fs.readFileSync(outputPdfPath);
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF and verify it has at least one page
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

    // Verify that OCR was called
    expect(performOcr).toHaveBeenCalled();
  });

  test('should handle processing with concurrency', async () => {
    // Process the PDF with higher concurrency
    await processPdf(singlePagePdfPath, outputPdfPath, 4);

    // Verify the output file exists
    expect(fs.existsSync(outputPdfPath)).toBe(true);

    // Verify it's a valid PDF
    const pdfBuffer = fs.readFileSync(outputPdfPath);
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Verify that OCR was called
    expect(performOcr).toHaveBeenCalled();
  });

  test('should handle processing with max pages', async () => {
    // Process the PDF with max pages set to 1
    await processPdf(singlePagePdfPath, outputPdfPath, 2, 1);

    // Verify the output file exists
    expect(fs.existsSync(outputPdfPath)).toBe(true);

    // Verify it's a valid PDF
    const pdfBuffer = fs.readFileSync(outputPdfPath);
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Verify that OCR was called
    expect(performOcr).toHaveBeenCalled();
  });

  test('should process with custom OCR options', async () => {
    // Define custom OCR options
    const ocrOptions = {
      maxRetries: 5,
      retryDelay: 500,
      timeout: 60000,
      verbose: true
    };

    // Process the PDF with custom OCR options
    await processPdf(singlePagePdfPath, outputPdfPath, 2, undefined, ocrOptions);

    // Verify the output file exists
    expect(fs.existsSync(outputPdfPath)).toBe(true);

    // Verify it's a valid PDF
    const pdfBuffer = fs.readFileSync(outputPdfPath);
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Verify that OCR was called with the custom options
    expect(performOcr).toHaveBeenCalledWith(
      expect.any(Buffer),
      ocrOptions
    );
  });
});
