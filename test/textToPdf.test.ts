import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { textToPdf } from '../src/textToPdf';

describe('Text to PDF converter', () => {
  test('should create a PDF with the given text', async () => {
    const text = 'This is a test text for PDF creation';
    const pdfBuffer = await textToPdf(text);

    // Verify it's a Buffer
    expect(pdfBuffer).toBeInstanceOf(Buffer);

    // Verify it's a valid PDF
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF and verify it has content
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);

    // We can't easily extract text from the PDF to verify content,
    // but we can check that the PDF was created successfully
  });

  test('should handle empty text', async () => {
    const pdfBuffer = await textToPdf('');

    // Verify it's a Buffer
    expect(pdfBuffer).toBeInstanceOf(Buffer);

    // Verify it's a valid PDF
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF and verify it has a page
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  test('should handle long text with multiple pages', async () => {
    // Create a long text that should span multiple pages
    const longText = Array(100).fill('This is a line of text that will be repeated many times to create a multi-page PDF. ').join('\n');

    const pdfBuffer = await textToPdf(longText);

    // Verify it's a Buffer
    expect(pdfBuffer).toBeInstanceOf(Buffer);

    // Verify it's a valid PDF
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF and verify it has multiple pages
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(1);
  });

  test('should respect page dimensions', async () => {
    const text = 'This is a test text for PDF creation';

    // Create PDFs with different page dimensions
    const defaultPdf = await textToPdf(text);
    const customPdf = await textToPdf(text, { width: 400, height: 300 });

    // Load the PDFs
    const defaultDoc = await PDFDocument.load(defaultPdf);
    const customDoc = await PDFDocument.load(customPdf);

    // Get page dimensions
    const defaultPage = defaultDoc.getPage(0);
    const customPage = customDoc.getPage(0);

    const defaultSize = defaultPage.getSize();
    const customSize = customPage.getSize();

    // Verify custom dimensions were applied
    expect(customSize.width).toBe(400);
    expect(customSize.height).toBe(300);

    // Verify default dimensions are different
    expect(defaultSize.width).not.toBe(400);
    expect(defaultSize.height).not.toBe(300);
  });

  test('should handle special characters', async () => {
    const textWithSpecialChars = 'Special characters: áéíóú ñ ç ß Ø Æ 漢字 😊';

    const pdfBuffer = await textToPdf(textWithSpecialChars);

    // Verify it's a valid PDF
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF to verify it was created successfully
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  test('should handle text with newlines', async () => {
    const textWithNewlines = 'Line 1\nLine 2\n\nLine 4';

    const pdfBuffer = await textToPdf(textWithNewlines);

    // Verify it's a valid PDF
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF to verify it was created successfully
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  test('should handle empty paragraphs', async () => {
    const textWithEmptyParagraphs = '\n\n\n';

    const pdfBuffer = await textToPdf(textWithEmptyParagraphs);

    // Verify it's a valid PDF
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF to verify it was created successfully
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  test('should handle unsupported characters gracefully', async () => {
    // Create a string with a mix of supported and unsupported characters
    const mixedText = 'Regular text with some 漢字 and emoji 😊 mixed in';

    const pdfBuffer = await textToPdf(mixedText);

    // Verify it's a valid PDF
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');

    // Load the PDF to verify it was created successfully
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBe(1);
  });
});
