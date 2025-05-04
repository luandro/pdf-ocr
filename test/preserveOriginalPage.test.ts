import { preserveOriginalPage } from '../src/preserveOriginalPage';
import { PDFDocument } from 'pdf-lib';

// Mock the pdf-lib module
jest.mock('pdf-lib', () => {
  return {
    PDFDocument: {
      load: jest.fn().mockImplementation(async () => ({
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
      }))
    }
  };
});

describe('Preserve Original Page Module', () => {
  // Sample PDF buffer
  const samplePdfBuffer = Buffer.from('sample-pdf-data');

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('preserveOriginalPage function', () => {
    test('should load and save the PDF document', async () => {
      // Call the function
      const result = await preserveOriginalPage(samplePdfBuffer);

      // Verify that PDFDocument.load was called with the correct buffer
      expect(PDFDocument.load).toHaveBeenCalledWith(samplePdfBuffer);

      // Verify that the result is a Buffer
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(4);
    });

    test('should handle verbose logging', async () => {
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Call the function with verbose option
      await preserveOriginalPage(samplePdfBuffer, { verbose: true });

      // Verify that console.log was called with the expected messages
      expect(consoleSpy).toHaveBeenCalledWith('Preserving original PDF page without OCR processing...');
      expect(consoleSpy).toHaveBeenCalledWith('Original page preserved successfully');

      // Restore console.log
      consoleSpy.mockRestore();
    });

    test('should handle errors gracefully', async () => {
      // Mock PDFDocument.load to throw an error
      (PDFDocument.load as jest.Mock).mockRejectedValueOnce(new Error('Failed to load PDF'));

      // Call the function and expect it to throw
      await expect(preserveOriginalPage(samplePdfBuffer)).rejects.toThrow('Failed to preserve original page: Failed to load PDF');
    });

    test('should handle non-Error objects in errors', async () => {
      // Mock PDFDocument.load to throw a non-Error object
      (PDFDocument.load as jest.Mock).mockRejectedValueOnce('String error');

      // Call the function and expect it to throw
      await expect(preserveOriginalPage(samplePdfBuffer)).rejects.toThrow('Failed to preserve original page: String error');
    });
  });
});
