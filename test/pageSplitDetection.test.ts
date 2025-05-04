import * as pageSplitDetectionModule from '../src/pageSplitDetection';
import { Together } from 'together-ai';
import { VISION_MODEL } from '../src/constants';
import fs from 'fs';
import path from 'path';

// Get the actual implementation
const { detectPageSplit } = pageSplitDetectionModule;

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

describe('Page Split Detection Module', () => {
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

  describe('detectPageSplit function', () => {
    test('should call Together API with correct parameters', async () => {
      // Mock the create method to return a valid response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"needsSplitting": true, "margin": "-375", "explanation": "The page has a clear center line."}'
            }
          }
        ]
      });

      // Call the function
      await detectPageSplit(samplePdfBuffer);

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

    test('should return correct result when page needs splitting', async () => {
      // Mock the create method to return a response indicating splitting is needed
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"needsSplitting": true, "margin": "-375", "explanation": "The page has a clear center line."}'
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageSplit(samplePdfBuffer);

      // Verify the result
      expect(result).toEqual({
        needsSplitting: true,
        margin: '-375',
        explanation: 'The page has a clear center line.'
      });
    });

    test('should return correct result when page does not need splitting', async () => {
      // Mock the create method to return a response indicating splitting is not needed
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"needsSplitting": false, "explanation": "The page is a single page."}'
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageSplit(samplePdfBuffer);

      // Verify the result
      expect(result).toEqual({
        needsSplitting: false,
        explanation: 'The page is a single page.'
      });
    });

    test('should handle API errors gracefully', async () => {
      // Mock the create method to throw an error
      mockCreate.mockRejectedValue(new Error('API Error'));

      // Call the function with verbose set to false to avoid console output in tests
      const result = await detectPageSplit(samplePdfBuffer, { verbose: false });

      // Verify that the function returns a default result when API fails
      expect(result).toEqual({
        needsSplitting: false,
        explanation: expect.stringContaining('Detection failed')
      });
    });

    test('should handle missing API key', async () => {
      // Remove API key for this test
      delete process.env.TOGETHER_API_KEY;

      // Call the function and expect it to throw
      await expect(detectPageSplit(samplePdfBuffer)).rejects.toThrow('TOGETHER_API_KEY environment variable is not set');

      // Restore API key for other tests
      process.env.TOGETHER_API_KEY = 'test-api-key';
    });

    test('should handle non-JSON responses', async () => {
      // Mock the create method to return a non-JSON response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Yes, this page needs to be split. The margin should be around -375.'
            }
          }
        ]
      });

      // Call the function
      const result = await detectPageSplit(samplePdfBuffer, { verbose: true });

      // Verify that the function extracts information from the text
      expect(result).toEqual({
        needsSplitting: true,
        margin: '-375',
        explanation: expect.stringContaining('Determined from text response')
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
      const result = await detectPageSplit(samplePdfBuffer);

      // Verify that the function returns a default result
      expect(result).toEqual({
        needsSplitting: false,
        explanation: 'Determined from text response (JSON parsing failed)'
      });
    });
  });
});
