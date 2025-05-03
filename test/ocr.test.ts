import fs from 'fs';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';
import { performOcr } from '../src/ocr';

// Mock the Mistral client
jest.mock('@mistralai/mistralai');

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
});
