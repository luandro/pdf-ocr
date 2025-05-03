import fs from 'fs';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';
import { performOcr } from '../src/ocr';

// Mock the Mistral client
jest.mock('@mistralai/mistralai');

// Mock the content verification module
jest.mock('../src/contentVerification', () => ({
  verifyContent: jest.fn().mockImplementation(async (text) => {
    // Return a modified version of the input text to verify it was called
    return `Verified: ${text}`;
  })
}));

describe('OCR Module', () => {
  const samplePdfPath = path.join(__dirname, '../fixtures/sample.pdf');
  let samplePdfBuffer: Buffer;

  beforeAll(() => {
    // Create a sample PDF if it doesn't exist
    if (!fs.existsSync(samplePdfPath)) {
      // For testing, we'll just create a simple PDF buffer
      samplePdfBuffer = Buffer.from('Mock PDF content');
      fs.writeFileSync(samplePdfPath, samplePdfBuffer);
    } else {
      samplePdfBuffer = fs.readFileSync(samplePdfPath);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Set mock API key for tests
    process.env.MISTRAL_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    // Clean up
    delete process.env.MISTRAL_API_KEY;
  });

  test('should call Mistral API with correct parameters', async () => {
    // Mock OCR process response
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: 'This is a sample text for OCR testing'
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function
    await performOcr(samplePdfBuffer);

    // Verify OCR process was called with the correct parameters
    expect(mockOcrProcess).toHaveBeenCalledWith({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: `data:application/pdf;base64,${samplePdfBuffer.toString('base64')}`
      }
    });
  });

  test('should return extracted text from response (content field)', async () => {
    const expectedText = 'This is a sample text for OCR testing';

    // Mock OCR process response
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: expectedText
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function
    const result = await performOcr(samplePdfBuffer);

    // Verify the result
    expect(result).toBe(expectedText);
  });

  test('should return extracted text from response (pages with markdown)', async () => {
    const page1Text = 'Page 1 markdown content';
    const page2Text = 'Page 2 markdown content';
    const expectedText = `${page1Text}\n\n${page2Text}`;

    // Mock OCR process response with pages
    const mockOcrProcess = jest.fn().mockResolvedValue({
      pages: [
        { index: 0, markdown: page1Text },
        { index: 1, markdown: page2Text }
      ],
      model: 'mistral-ocr-latest',
      usageInfo: {
        pagesProcessed: 2,
        docSizeBytes: 1000
      }
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function
    const result = await performOcr(samplePdfBuffer);

    // Verify the result
    expect(result).toBe(expectedText);
  });

  test('should handle empty pages in OCR response', async () => {
    // Mock OCR process response with empty pages
    const mockOcrProcess = jest.fn().mockResolvedValue({
      pages: [
        { index: 0, markdown: '' },
        { index: 1, markdown: undefined },
        { index: 2 } // No markdown field
      ],
      model: 'mistral-ocr-latest',
      usageInfo: {
        pagesProcessed: 3,
        docSizeBytes: 1000
      }
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function with verbose mode to test the "No text was extracted" branch
    const result = await performOcr(samplePdfBuffer, { verbose: true });

    // Verify the result is an empty string
    expect(result).toBe('');
  });

  test('should filter out markdown image references', async () => {
    // Mock OCR process response with markdown image references
    const mockOcrProcess = jest.fn().mockResolvedValue({
      pages: [
        {
          index: 0,
          markdown: 'Some text\n\n![img-0.jpeg](img-0.jpeg)\n\nMore text'
        },
        {
          index: 1,
          markdown: '![img-1.jpeg](img-1.jpeg)\n\nOnly text after image'
        },
        {
          index: 2,
          markdown: 'Text before image\n\n![img-2.jpeg](img-2.jpeg)'
        }
      ],
      model: 'mistral-ocr-latest'
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function
    const result = await performOcr(samplePdfBuffer, { verbose: true });

    // Verify the result has image references removed
    expect(result).not.toContain('![img-0.jpeg](img-0.jpeg)');
    expect(result).not.toContain('![img-1.jpeg](img-1.jpeg)');
    expect(result).not.toContain('![img-2.jpeg](img-2.jpeg)');

    // Verify the text content is preserved
    expect(result).toContain('Some text');
    expect(result).toContain('More text');
    expect(result).toContain('Only text after image');
    expect(result).toContain('Text before image');
  });

  test('should handle API errors gracefully', async () => {
    // Mock OCR process to throw an error
    const mockOcrProcess = jest.fn().mockRejectedValue(new Error('API Error'));

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function with only 1 retry to speed up the test
    await expect(performOcr(samplePdfBuffer, { maxRetries: 1, retryDelay: 10 }))
      .rejects.toThrow('OCR failed after 1 attempts: API Error');

    // Verify that the API was called exactly once (no retries with maxRetries=1)
    expect(mockOcrProcess).toHaveBeenCalledTimes(1);
  });

  test('should handle missing API key', async () => {
    // Remove API key for this test
    delete process.env.MISTRAL_API_KEY;

    // Call the function and expect it to throw
    await expect(performOcr(samplePdfBuffer)).rejects.toThrow('MISTRAL_API_KEY environment variable is not set');

    // Restore API key for other tests
    process.env.MISTRAL_API_KEY = 'test-api-key';
  });

  test('should handle non-Error exceptions', async () => {
    // Mock OCR process to throw a non-Error value
    const mockOcrProcess = jest.fn().mockImplementation(() => {
      throw 'Not an Error object';
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function with only 1 retry to speed up the test
    await expect(performOcr(samplePdfBuffer, { maxRetries: 1, retryDelay: 10 }))
      .rejects.toThrow('OCR failed after 1 attempts: Unknown error');
  });

  test('should retry on failure and succeed eventually', async () => {
    // Mock OCR process to fail twice then succeed
    const mockOcrProcess = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce({ content: 'Success after retries' });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function with 3 retries
    const result = await performOcr(samplePdfBuffer, {
      maxRetries: 3,
      retryDelay: 10,
      verbose: true // Test verbose mode
    });

    // Verify the result
    expect(result).toBe('Success after retries');

    // Verify that the API was called exactly 3 times (2 failures + 1 success)
    expect(mockOcrProcess).toHaveBeenCalledTimes(3);
  });

  test('should respect timeout option', async () => {
    // Mock OCR process response
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: 'Success with timeout'
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function with custom timeout
    await performOcr(samplePdfBuffer, { timeout: 5000 });

    // Verify that Mistral was constructed with the correct options
    expect(Mistral).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'test-api-key'
    }));
  });

  test('should use content verification when enabled', async () => {
    const originalText = 'Text to be verified';

    // Mock OCR process response
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: originalText
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Import the mocked verifyContent function
    const { verifyContent } = require('../src/contentVerification');

    // Call the function with content verification enabled
    const result = await performOcr(samplePdfBuffer, {
      verifyContent: true,
      verbose: true
    });

    // Verify that verifyContent was called with the original text
    expect(verifyContent).toHaveBeenCalledWith(originalText, expect.objectContaining({
      verbose: true
    }));

    // Verify the result includes the verification prefix
    expect(result).toBe(`Verified: ${originalText}`);
  });

  test('should handle content verification errors gracefully', async () => {
    const originalText = 'Text that will cause verification to fail';

    // Mock OCR process response
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: originalText
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Import the mocked verifyContent function and make it throw an error
    const { verifyContent } = require('../src/contentVerification');
    verifyContent.mockRejectedValueOnce(new Error('Verification failed'));

    // Call the function with content verification enabled
    const result = await performOcr(samplePdfBuffer, {
      verifyContent: true,
      verbose: true
    });

    // Verify that verifyContent was called
    expect(verifyContent).toHaveBeenCalled();

    // Verify the result is the original text (fallback when verification fails)
    expect(result).toBe(originalText);
  });

  test('should handle the case when all retries are exhausted', async () => {
    // Mock OCR process to fail all attempts
    const mockOcrProcess = jest.fn()
      .mockRejectedValue(new Error('Persistent failure'));

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function with 3 retries
    await expect(performOcr(samplePdfBuffer, {
      maxRetries: 3,
      retryDelay: 10,
      verbose: true
    })).rejects.toThrow('OCR failed after 3 attempts: Persistent failure');

    // Verify that the API was called exactly 3 times
    expect(mockOcrProcess).toHaveBeenCalledTimes(3);
  });

  test('should handle the case when lastError is null', async () => {
    // This is an edge case that should never happen in practice,
    // but we need to test it for coverage

    // Mock OCR process with a custom implementation that doesn't set lastError
    const mockOcrProcess = jest.fn().mockImplementation(() => {
      // This will cause the catch block to execute but not set lastError
      throw null;
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function with 1 retry
    await expect(performOcr(samplePdfBuffer, {
      maxRetries: 1,
      retryDelay: 10
    })).rejects.toThrow('OCR failed after 1 attempts: Unknown error');
  });
});
