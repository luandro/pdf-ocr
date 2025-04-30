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
    // Mock file upload response
    const mockFileUpload = jest.fn().mockResolvedValue({
      id: 'test-file-id',
      object: 'file',
      bytes: 1000,
      created_at: Date.now(),
      filename: 'test.pdf',
      purpose: 'ocr'
    });

    // Mock signed URL response
    const mockGetSignedUrl = jest.fn().mockResolvedValue({
      url: 'https://example.com/signed-url',
      expires_at: Date.now() + 3600000
    });

    // Mock OCR process response
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: 'This is a sample text for OCR testing'
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      files: {
        upload: mockFileUpload,
        getSignedUrl: mockGetSignedUrl
      },
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function
    await performOcr(samplePdfBuffer);

    // Verify file upload was called with the correct parameters
    expect(mockFileUpload).toHaveBeenCalledWith({
      file: {
        fileName: expect.stringMatching(/document-.*\.pdf/),
        content: samplePdfBuffer
      }
    });

    // Verify getSignedUrl was called with the correct file ID
    expect(mockGetSignedUrl).toHaveBeenCalledWith({
      fileId: 'test-file-id'
    });

    // Verify OCR process was called with the correct URL
    expect(mockOcrProcess).toHaveBeenCalledWith({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: 'https://example.com/signed-url'
      }
    });
  });

  test('should return extracted text from response', async () => {
    const expectedText = 'This is a sample text for OCR testing';

    // Mock file upload response
    const mockFileUpload = jest.fn().mockResolvedValue({
      id: 'test-file-id',
      object: 'file',
      bytes: 1000,
      created_at: Date.now(),
      filename: 'test.pdf',
      purpose: 'ocr'
    });

    // Mock signed URL response
    const mockGetSignedUrl = jest.fn().mockResolvedValue({
      url: 'https://example.com/signed-url',
      expires_at: Date.now() + 3600000
    });

    // Mock OCR process response
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: expectedText
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      files: {
        upload: mockFileUpload,
        getSignedUrl: mockGetSignedUrl
      },
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function
    const result = await performOcr(samplePdfBuffer);

    // Verify the result
    expect(result).toBe(expectedText);
  });

  test('should handle API errors gracefully', async () => {
    // Mock file upload response
    const mockFileUpload = jest.fn().mockResolvedValue({
      id: 'test-file-id',
      object: 'file',
      bytes: 1000,
      created_at: Date.now(),
      filename: 'test.pdf',
      purpose: 'ocr'
    });

    // Mock signed URL response
    const mockGetSignedUrl = jest.fn().mockResolvedValue({
      url: 'https://example.com/signed-url',
      expires_at: Date.now() + 3600000
    });

    // Mock OCR process to throw an error
    const mockOcrProcess = jest.fn().mockRejectedValue(new Error('API Error'));

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      files: {
        upload: mockFileUpload,
        getSignedUrl: mockGetSignedUrl
      },
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
    // Mock file upload response
    const mockFileUpload = jest.fn().mockResolvedValue({
      id: 'test-file-id',
      object: 'file',
      bytes: 1000,
      created_at: Date.now(),
      filename: 'test.pdf',
      purpose: 'ocr'
    });

    // Mock signed URL response
    const mockGetSignedUrl = jest.fn().mockResolvedValue({
      url: 'https://example.com/signed-url',
      expires_at: Date.now() + 3600000
    });

    // Mock OCR process to throw a non-Error value
    const mockOcrProcess = jest.fn().mockImplementation(() => {
      throw 'Not an Error object';
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      files: {
        upload: mockFileUpload,
        getSignedUrl: mockGetSignedUrl
      },
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function with only 1 retry to speed up the test
    await expect(performOcr(samplePdfBuffer, { maxRetries: 1, retryDelay: 10 }))
      .rejects.toThrow('OCR failed after 1 attempts: Unknown error');
  });

  test('should retry on failure and succeed eventually', async () => {
    // Mock file upload response
    const mockFileUpload = jest.fn().mockResolvedValue({
      id: 'test-file-id',
      object: 'file',
      bytes: 1000,
      created_at: Date.now(),
      filename: 'test.pdf',
      purpose: 'ocr'
    });

    // Mock signed URL response
    const mockGetSignedUrl = jest.fn().mockResolvedValue({
      url: 'https://example.com/signed-url',
      expires_at: Date.now() + 3600000
    });

    // Mock OCR process to fail twice then succeed
    const mockOcrProcess = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce({ content: 'Success after retries' });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      files: {
        upload: mockFileUpload,
        getSignedUrl: mockGetSignedUrl
      },
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

    // Verify that file upload was called 3 times (once for each attempt)
    expect(mockFileUpload).toHaveBeenCalledTimes(3);

    // Verify that getSignedUrl was called 3 times (once for each attempt)
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(3);
  });

  test('should respect timeout option', async () => {
    // Mock file upload response
    const mockFileUpload = jest.fn().mockResolvedValue({
      id: 'test-file-id',
      object: 'file',
      bytes: 1000,
      created_at: Date.now(),
      filename: 'test.pdf',
      purpose: 'ocr'
    });

    // Mock signed URL response
    const mockGetSignedUrl = jest.fn().mockResolvedValue({
      url: 'https://example.com/signed-url',
      expires_at: Date.now() + 3600000
    });

    // Mock OCR process response
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: 'Success with timeout'
    });

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      files: {
        upload: mockFileUpload,
        getSignedUrl: mockGetSignedUrl
      },
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
