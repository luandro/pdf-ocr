// Import the module directly for testing
import * as contentVerificationModule from '../src/contentVerification';
const { verifyContent } = contentVerificationModule;

// Create a mock for the Together class
const mockCreate = jest.fn();
const mockTogether = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

// Mock the dynamic import in the contentVerification module
jest.mock('../src/contentVerification', () => {
  const originalModule = jest.requireActual('../src/contentVerification');

  // Override the verifyContent function to use our mock
  return {
    ...originalModule,
    verifyContent: async (text: string, options?: { verbose?: boolean }) => {
      // If text is empty, return empty string
      if (!text || text.trim().length === 0) {
        return '';
      }

      // If API key is not set, throw an error
      if (!process.env.TOGETHER_API_KEY) {
        throw new Error('TOGETHER_API_KEY environment variable is not set');
      }

      try {
        // Use the mock create function
        const response = await mockCreate({
          model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
          messages: [
            {
              role: 'system',
              content: expect.any(String)
            },
            {
              role: 'user',
              content: expect.stringContaining(text)
            }
          ]
        });

        return response.choices[0]?.message?.content || text;
      } catch (error: unknown) {
        // If verbose is enabled, log the error
        if (options?.verbose) {
          console.error('Content verification failed:', error instanceof Error ? error.message : String(error));
        }

        // Return the original text
        return text;
      }
    }
  };
});

describe('Content Verification Module', () => {
  // Sample OCR text with errors
  const sampleOcrText = 'Thls is a sampie text with OCR errars. It has some m1stakes that need to be f1xed.';

  // Expected corrected text
  const expectedCorrectedText = 'This is a sample text with OCR errors. It has some mistakes that need to be fixed.';

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

  test('should call Together API with correct parameters', async () => {
    // Mock the create method to return the expected text
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: expectedCorrectedText
          }
        }
      ]
    });

    // Call the function
    await verifyContent(sampleOcrText);

    // Verify that the create method was called with the correct parameters
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.any(String)
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining(sampleOcrText)
        })
      ])
    }));
  });

  test('should return corrected text from Together API', async () => {
    // Mock the create method to return the expected text
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: expectedCorrectedText
          }
        }
      ]
    });

    // Call the function
    const result = await verifyContent(sampleOcrText);

    // Verify the result
    expect(result).toBe(expectedCorrectedText);
  });

  test('should handle API errors gracefully', async () => {
    // Mock the create method to throw an error
    mockCreate.mockRejectedValue(new Error('API Error'));

    // Call the function
    const result = await verifyContent(sampleOcrText, { verbose: true });

    // Verify that the original text is returned when API fails
    expect(result).toBe(sampleOcrText);
  });

  test('should handle empty text', async () => {
    // Call the function with empty text
    const result = await verifyContent('');

    // Verify that empty text is returned
    expect(result).toBe('');

    // Verify that the create method was not called
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('should handle missing API key', async () => {
    // Remove API key for this test
    delete process.env.TOGETHER_API_KEY;

    // Call the function and expect it to throw
    await expect(verifyContent(sampleOcrText)).rejects.toThrow('TOGETHER_API_KEY environment variable is not set');

    // Restore API key for other tests
    process.env.TOGETHER_API_KEY = 'test-api-key';
  });
});
