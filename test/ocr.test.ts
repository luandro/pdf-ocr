import fs from 'fs';
import path from 'path';
import os from 'os';
import { Mistral } from '@mistralai/mistralai';
import { performOcr } from '../src/ocr';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock the Mistral client
jest.mock('@mistralai/mistralai');

describe('OCR Module', () => {
  const sampleImagePath = path.join(__dirname, '../fixtures/sample.png');
  let sampleImageBuffer: Buffer;

  beforeAll(() => {
    // Create a sample image if it doesn't exist
    if (!fs.existsSync(sampleImagePath)) {
      // Create a simple PNG with text
      const canvas = require('canvas');
      const { createCanvas } = canvas;
      const c = createCanvas(400, 200);
      const ctx = c.getContext('2d');

      // Fill background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 200);

      // Add text
      ctx.fillStyle = 'black';
      ctx.font = '20px Arial';
      ctx.fillText('This is a sample text for OCR testing', 50, 100);

      // Save to file
      const buffer = c.toBuffer('image/png');
      fs.writeFileSync(sampleImagePath, buffer);
      sampleImageBuffer = buffer;
    } else {
      sampleImageBuffer = fs.readFileSync(sampleImagePath);
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
    const mockFetchResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-file-id',
        object: 'file',
        bytes: 1000,
        created_at: Date.now(),
        filename: 'test.png',
        purpose: 'ocr'
      }),
      text: jest.fn().mockResolvedValue('')
    };

    // Mock fetch to return the file upload response
    mockedFetch.mockResolvedValueOnce(mockFetchResponse as any);

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

    // Mock fs functions
    jest.spyOn(fs, 'mkdtempSync').mockReturnValue('/tmp/test-dir');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test'));
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(fs, 'rmdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mock-stream' as any);

    // Call the function
    await performOcr(sampleImageBuffer);

    // Verify fetch was called with the correct URL
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/files',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer')
        })
      })
    );

    // Verify OCR process was called with the correct file ID
    expect(mockOcrProcess).toHaveBeenCalledWith({
      model: 'Focus',
      document: expect.objectContaining({
        type: 'file_id',
        fileId: 'test-file-id'
      })
    });
  });

  test('should return extracted text from response', async () => {
    const expectedText = 'This is a sample text for OCR testing';

    // Mock file upload response
    const mockFetchResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-file-id',
        object: 'file',
        bytes: 1000,
        created_at: Date.now(),
        filename: 'test.png',
        purpose: 'ocr'
      }),
      text: jest.fn().mockResolvedValue('')
    };

    // Mock fetch to return the file upload response
    mockedFetch.mockResolvedValueOnce(mockFetchResponse as any);

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

    // Mock fs functions
    jest.spyOn(fs, 'mkdtempSync').mockReturnValue('/tmp/test-dir');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test'));
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(fs, 'rmdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mock-stream' as any);

    // Call the function
    const result = await performOcr(sampleImageBuffer);

    // Verify the result
    expect(result).toBe(expectedText);
  });

  test('should handle API errors gracefully', async () => {
    // Mock file upload response
    const mockFetchResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-file-id',
        object: 'file',
        bytes: 1000,
        created_at: Date.now(),
        filename: 'test.png',
        purpose: 'ocr'
      }),
      text: jest.fn().mockResolvedValue('')
    };

    // Mock fetch to return the file upload response
    mockedFetch.mockResolvedValueOnce(mockFetchResponse as any);

    // Mock OCR process to throw an error
    const mockOcrProcess = jest.fn().mockRejectedValue(new Error('API Error'));

    // Setup the Mistral mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Mock fs functions
    jest.spyOn(fs, 'mkdtempSync').mockReturnValue('/tmp/test-dir');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test'));
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(fs, 'rmdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mock-stream' as any);

    // Call the function with only 1 retry to speed up the test
    await expect(performOcr(sampleImageBuffer, { maxRetries: 1, retryDelay: 10 }))
      .rejects.toThrow('OCR failed after 1 attempts: API Error');

    // Verify that the API was called exactly once (no retries with maxRetries=1)
    expect(mockOcrProcess).toHaveBeenCalledTimes(1);
  });

  test('should handle missing API key', async () => {
    // Remove API key for this test
    delete process.env.MISTRAL_API_KEY;

    // Call the function and expect it to throw
    await expect(performOcr(sampleImageBuffer)).rejects.toThrow('MISTRAL_API_KEY environment variable is not set');

    // Restore API key for other tests
    process.env.MISTRAL_API_KEY = 'test-api-key';
  });

  test('should handle non-Error exceptions', async () => {
    // Mock file upload response
    const mockFetchResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-file-id',
        object: 'file',
        bytes: 1000,
        created_at: Date.now(),
        filename: 'test.png',
        purpose: 'ocr'
      }),
      text: jest.fn().mockResolvedValue('')
    };

    // Mock fetch to return the file upload response
    mockedFetch.mockResolvedValueOnce(mockFetchResponse as any);

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

    // Mock fs functions
    jest.spyOn(fs, 'mkdtempSync').mockReturnValue('/tmp/test-dir');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test'));
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(fs, 'rmdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mock-stream' as any);

    // Call the function with only 1 retry to speed up the test
    await expect(performOcr(sampleImageBuffer, { maxRetries: 1, retryDelay: 10 }))
      .rejects.toThrow('OCR failed after 1 attempts: Unknown error');
  });

  test('should retry on failure and succeed eventually', async () => {
    // Mock file upload response for each attempt
    const mockFetchResponse1 = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-file-id-1',
        object: 'file',
        bytes: 1000,
        created_at: Date.now(),
        filename: 'test.png',
        purpose: 'ocr'
      }),
      text: jest.fn().mockResolvedValue('')
    };

    const mockFetchResponse2 = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-file-id-2',
        object: 'file',
        bytes: 1000,
        created_at: Date.now(),
        filename: 'test.png',
        purpose: 'ocr'
      }),
      text: jest.fn().mockResolvedValue('')
    };

    const mockFetchResponse3 = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-file-id-3',
        object: 'file',
        bytes: 1000,
        created_at: Date.now(),
        filename: 'test.png',
        purpose: 'ocr'
      }),
      text: jest.fn().mockResolvedValue('')
    };

    // Mock fetch to return the file upload responses for each attempt
    mockedFetch
      .mockResolvedValueOnce(mockFetchResponse1 as any)
      .mockResolvedValueOnce(mockFetchResponse2 as any)
      .mockResolvedValueOnce(mockFetchResponse3 as any);

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

    // Mock fs functions
    jest.spyOn(fs, 'mkdtempSync').mockReturnValue('/tmp/test-dir');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test'));
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(fs, 'rmdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mock-stream' as any);

    // Call the function with 3 retries
    const result = await performOcr(sampleImageBuffer, {
      maxRetries: 3,
      retryDelay: 10,
      verbose: true // Test verbose mode
    });

    // Verify the result
    expect(result).toBe('Success after retries');

    // Verify that the API was called exactly 3 times (2 failures + 1 success)
    expect(mockOcrProcess).toHaveBeenCalledTimes(3);

    // Verify that fetch was called 3 times (once for each attempt)
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  test('should respect timeout option', async () => {
    // Mock file upload response
    const mockFetchResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-file-id',
        object: 'file',
        bytes: 1000,
        created_at: Date.now(),
        filename: 'test.png',
        purpose: 'ocr'
      }),
      text: jest.fn().mockResolvedValue('')
    };

    // Mock fetch to return the file upload response
    mockedFetch.mockResolvedValueOnce(mockFetchResponse as any);

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

    // Mock fs functions
    jest.spyOn(fs, 'mkdtempSync').mockReturnValue('/tmp/test-dir');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test'));
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(fs, 'rmdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mock-stream' as any);

    // Call the function with custom timeout
    await performOcr(sampleImageBuffer, { timeout: 5000 });

    // Verify that fetch was called with the correct timeout
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/files',
      expect.objectContaining({
        timeout: 5000
      })
    );

    // Verify that Mistral was constructed with the correct options
    expect(Mistral).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'test-api-key'
    }));
  });
});
