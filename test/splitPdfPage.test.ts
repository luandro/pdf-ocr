import { splitPdfPage } from '../src/splitPdfPage';
import { execSync } from 'child_process';
import fs from 'fs';

// Mock the execSync function
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Mock the fs module
jest.mock('fs', () => ({
  mkdtempSync: jest.fn().mockReturnValue('/tmp/mock-temp-dir'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-pdf-data')),
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
  rmSync: jest.fn()
}));

describe('Split PDF Page Module', () => {
  // Sample PDF buffer
  const samplePdfBuffer = Buffer.from('sample-pdf-data');

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (execSync as jest.Mock).mockImplementation(() => Buffer.from(''));
  });

  describe('splitPdfPage function', () => {
    test('should check for required binaries', async () => {
      // Mock execSync to simulate binaries being available
      (execSync as jest.Mock).mockImplementation(() => Buffer.from(''));

      // Call the function
      await splitPdfPage(samplePdfBuffer);

      // Verify that execSync was called to check for binaries
      expect(execSync).toHaveBeenCalledWith('which pdftk', expect.anything());
      expect(execSync).toHaveBeenCalledWith('which pdfcrop', expect.anything());
    });

    test('should throw error if binaries are missing', async () => {
      // Mock execSync to simulate missing binaries
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('which')) {
          throw new Error('Command failed');
        }
        return Buffer.from('');
      });

      // Call the function and expect it to throw
      await expect(splitPdfPage(samplePdfBuffer)).rejects.toThrow('Cannot split PDF page');
    });

    test('should create temporary directory and files', async () => {
      // Call the function
      await splitPdfPage(samplePdfBuffer);

      // Verify that temporary directory was created
      expect(fs.mkdtempSync).toHaveBeenCalled();

      // Verify that input PDF was written to temp file
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('/input.pdf'),
        samplePdfBuffer
      );
    });

    test('should call pdfcrop for left and right halves', async () => {
      // Call the function
      await splitPdfPage(samplePdfBuffer);

      // Verify that pdfcrop was called for left half
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('pdfcrop --margins "-0 -0'),
        expect.anything()
      );

      // Verify that pdfcrop was called for right half
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('pdfcrop --margins'),
        expect.anything()
      );
    });

    test('should read and return split pages', async () => {
      // Call the function
      const result = await splitPdfPage(samplePdfBuffer);

      // Verify that readFileSync was called for both halves
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);

      // Verify the result
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(Buffer.from('mock-pdf-data'));
      expect(result[1]).toEqual(Buffer.from('mock-pdf-data'));
    });

    test('should clean up temporary directory', async () => {
      // Call the function
      await splitPdfPage(samplePdfBuffer);

      // Verify that rmSync was called to clean up
      expect(fs.rmSync).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/mock-temp-dir'),
        expect.objectContaining({ recursive: true, force: true })
      );
    });

    test('should handle case when only one half is valid', async () => {
      // Mock existsSync to simulate only left half being valid
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path.includes('left.pdf');
      });

      // Call the function
      const result = await splitPdfPage(samplePdfBuffer);

      // Verify the result
      expect(result).toHaveLength(1);
    });

    test('should throw error when both halves are invalid', async () => {
      // Mock existsSync to simulate both halves being invalid
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Call the function and expect it to throw
      await expect(splitPdfPage(samplePdfBuffer)).rejects.toThrow('PDF page splitting failed');
    });

    test('should use custom margin value when provided', async () => {
      // Mock existsSync to return true for both left and right pages
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Call the function with custom margin
      await splitPdfPage(samplePdfBuffer, { margin: '-500' });

      // Verify that pdfcrop was called with custom margin
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('-500'),
        expect.anything()
      );
    });
  });
});
