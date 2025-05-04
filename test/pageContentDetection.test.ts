import * as pageContentDetectionModule from '../src/pageContentDetection';
import { Together } from 'together-ai';
import { VISION_MODEL } from '../src/constants';
import fs from 'fs';
import path from 'path';

// Get the actual implementation
const { detectPageContent } = pageContentDetectionModule;

// Create a mock for the Together class
const mockCreate = jest.fn();
const mockTogether = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

// Mock the Together class
jest.mock('together-ai', () => {
  return {
    Together: jest.fn().mockImplementation(() => mockTogether)
  };
});

// Mock the renderPdfToPng function
jest.mock('../src/renderPdfToPng', () => ({
  renderPdfToPng: jest.fn().mockResolvedValue(Buffer.from('mock-png-data'))
}));

describe('Page Content Detection Module', () => {
  // Sample PDF buffer
  const samplePdfBuffer = Buffer.from('sample-pdf-data');

  // Set up environment variables for testing
  beforeAll(() => {
    process.env.TOGETHER_API_KEY = 'test-api-key';
  });

  // Clean up environment variables after testing
  afterAll(() => {
    delete process.env.TOGETHER_API_KEY;
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockReset();
    process.env.TOGETHER_API_KEY = 'test-api-key';
  });

  describe('detectPageContent function', () => {
    test('should call Together API with correct parameters', async () => {
      // Mock the create method to return a valid response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"contentType": "text", "explanation": "The page contains text content."}'
            }
          }
        ]
      });

      // Call the function
      await detectPageContent(samplePdfBuffer);

      // Verify that the create method was called with the correct parameters
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: VISION_MODEL,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system'
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text'
              }),
              expect.objectContaining({
                type: 'image_url',
                image_url: expect.objectContaining({
                  url: expect.stringContaining('data:image/png;base64,')
                })
              })
            ])
          })
        ])
      }));
    });

    test('should return correct result for text content', async () => {
      // Mock the create method to return a response indicating text content
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"contentType": "text", "explanation": "The page contains text content."}'
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageContent(samplePdfBuffer);

      // Verify the result
      expect(result).toEqual({
        contentType: 'text',
        explanation: 'The page contains text content.'
      });
    });

    test('should return correct result for image content', async () => {
      // Mock the create method to return a response indicating image content
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"contentType": "image", "explanation": "The page contains only images without text."}'
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageContent(samplePdfBuffer);

      // Verify the result
      expect(result).toEqual({
        contentType: 'image',
        explanation: 'The page contains only images without text.'
      });
    });

    test('should return correct result for empty content', async () => {
      // Mock the create method to return a response indicating empty content
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"contentType": "empty", "explanation": "The page is blank."}'
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageContent(samplePdfBuffer);

      // Verify the result
      expect(result).toEqual({
        contentType: 'empty',
        explanation: 'The page is blank.'
      });
    });

    test('should handle API errors gracefully', async () => {
      // Mock the create method to throw an error
      mockCreate.mockRejectedValue(new Error('API Error'));

      // Call the function with verbose set to false to avoid console output in tests
      const result = await detectPageContent(samplePdfBuffer, { verbose: false });

      // Verify that the function returns a default result when API fails
      expect(result).toEqual({
        contentType: 'text',
        explanation: expect.stringContaining('Detection failed')
      });
    });

    test('should handle missing API key', async () => {
      // Remove API key for this test
      delete process.env.TOGETHER_API_KEY;

      // Call the function and expect it to throw
      await expect(detectPageContent(samplePdfBuffer)).rejects.toThrow('TOGETHER_API_KEY environment variable is not set');

      // Restore API key for other tests
      process.env.TOGETHER_API_KEY = 'test-api-key';
    });

    test('should handle non-JSON responses', async () => {
      // Mock the create method to return a non-JSON response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This page contains only images without any text.'
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageContent(samplePdfBuffer, { verbose: true });

      // Verify that the function extracts information from the text
      expect(result).toEqual({
        contentType: 'image',
        explanation: 'Determined from text response (JSON parsing failed)'
      });
    });

    test('should handle empty responses', async () => {
      // Mock the create method to return an empty response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: ''
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageContent(samplePdfBuffer);

      // Verify that the function returns a default result
      expect(result).toEqual({
        contentType: 'text',
        explanation: 'Determined from text response (JSON parsing failed)'
      });
    });

    test('should handle invalid content type in response', async () => {
      // Mock the create method to return an invalid content type
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"contentType": "invalid", "explanation": "Invalid content type."}'
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageContent(samplePdfBuffer, { verbose: true });

      // Verify that the function returns a default result
      expect(result).toEqual({
        contentType: 'text',
        explanation: 'Determined from text response (JSON parsing failed)'
      });
    });
  });
});
