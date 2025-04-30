import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { splitPdf } from '../src/splitPdf';

describe('PDF Splitter', () => {
  const simplePdfPath = path.join(__dirname, '../fixtures/simple.pdf');
  const singlePagePdfPath = path.join(__dirname, '../fixtures/single-page.pdf');
  const invalidPdfPath = path.join(__dirname, '../fixtures/invalid.pdf');

  test('should split a 3-page PDF into an array of 3 buffers', async () => {
    const pdfBuffer = fs.readFileSync(simplePdfPath);
    const pages = await splitPdf(pdfBuffer);

    expect(pages).toBeInstanceOf(Array);
    expect(pages.length).toBe(3);

    // Each page should be a Buffer
    pages.forEach(page => {
      expect(page).toBeInstanceOf(Buffer);
      // Each page should be a valid PDF (starts with %PDF)
      expect(page.toString('ascii', 0, 4)).toBe('%PDF');
    });
  });

  test('should split a single-page PDF into an array with one buffer', async () => {
    const pdfBuffer = fs.readFileSync(singlePagePdfPath);
    const pages = await splitPdf(pdfBuffer);

    expect(pages).toBeInstanceOf(Array);
    expect(pages.length).toBe(1);
    expect(pages[0]).toBeInstanceOf(Buffer);
    expect(pages[0].toString('ascii', 0, 4)).toBe('%PDF');
  });

  test('should respect maxPages parameter', async () => {
    const pdfBuffer = fs.readFileSync(simplePdfPath);

    // Test with maxPages = 2
    const pages1 = await splitPdf(pdfBuffer, 2);
    expect(pages1.length).toBe(2);

    // Test with maxPages = 1
    const pages2 = await splitPdf(pdfBuffer, 1);
    expect(pages2.length).toBe(1);

    // Test with maxPages > total pages
    const pages3 = await splitPdf(pdfBuffer, 10);
    expect(pages3.length).toBe(3); // Should still return only 3 pages
  });

  test('should throw meaningful error for invalid PDFs', async () => {
    const invalidPdfBuffer = fs.readFileSync(invalidPdfPath);

    await expect(splitPdf(invalidPdfBuffer)).rejects.toThrow('Invalid PDF');
  });

  test('should handle non-Error exceptions', async () => {
    // Mock the PDFDocument.load function to throw a non-Error value
    jest.spyOn(PDFDocument, 'load').mockImplementationOnce(() => {
      throw 'Not an Error object';
    });

    const pdfBuffer = Buffer.from('dummy data');
    await expect(splitPdf(pdfBuffer)).rejects.toThrow('Invalid PDF: Unknown error');
  });
});
