import fs from 'fs';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';
import { performOcr } from '../src/ocr';

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
    // Mock implementation
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: 'This is a sample text for OCR testing'
    });

    // Setup the mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function
    await performOcr(sampleImageBuffer);

    // Verify the API was called with correct parameters
    expect(mockOcrProcess).toHaveBeenCalledWith({
      model: 'Focus',
      document: expect.objectContaining({
        type: 'document_url',
        documentUrl: expect.stringContaining('data:image/png;base64,')
      })
    });
  });

  test('should return extracted text from response', async () => {
    const expectedText = 'This is a sample text for OCR testing';

    // Mock implementation
    const mockOcrProcess = jest.fn().mockResolvedValue({
      content: expectedText
    });

    // Setup the mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function
    const result = await performOcr(sampleImageBuffer);

    // Verify the result
    expect(result).toBe(expectedText);
  });

  test('should handle API errors gracefully', async () => {
    // Mock implementation that throws an error
    const mockOcrProcess = jest.fn().mockRejectedValue(new Error('API Error'));

    // Setup the mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function and expect it to throw
    await expect(performOcr(sampleImageBuffer)).rejects.toThrow('OCR failed: API Error');
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
    // Mock implementation that throws a non-Error value
    const mockOcrProcess = jest.fn().mockImplementation(() => {
      throw 'Not an Error object';
    });

    // Setup the mock
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));

    // Call the function and expect it to throw
    await expect(performOcr(sampleImageBuffer)).rejects.toThrow('OCR failed: Unknown error');
  });
});
