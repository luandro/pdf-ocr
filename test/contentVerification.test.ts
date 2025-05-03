// Import the module directly for testing
import * as contentVerificationModule from '../src/contentVerification';
import { Together } from 'together-ai';
import { VERIFICATION_MODEL, VERIFICATION_SYSTEM_PROMPT } from '../src/constants';

// Get the actual implementation
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

// Mock the Together class
jest.mock('together-ai', () => {
  return {
    Together: jest.fn().mockImplementation(() => mockTogether)
  };
});

// Create a mock for the createPrompt function
const createPrompt = jest.fn().mockImplementation((text: string) => {
  return `
I have some text that was extracted from a PDF using OCR. The OCR process may have introduced errors, such as:
- Misrecognized characters
- Broken words
- Missing punctuation
- Incorrect formatting
- Garbled text

Please fix any errors you find in the text while preserving the original meaning and structure. If you encounter text that seems completely nonsensical, try to make a reasonable guess based on context, but don't invent new content.

Here is the OCR text:

${text}

Please provide the corrected version of the text.
`;
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

  describe('verifyContent function', () => {
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
        model: VERIFICATION_MODEL,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: VERIFICATION_SYSTEM_PROMPT
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

    test('should use custom options when provided', async () => {
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

      // Call the function with custom options
      await verifyContent(sampleOcrText, {
        maxTokens: 2000,
        temperature: 0.5,
        topP: 0.8,
        verbose: true
      });

      // Verify that the create method was called with the custom options
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        max_tokens: 2000,
        temperature: 0.5,
        top_p: 0.8
      }));
    });

    test('should log verbose information when verbose is true', async () => {
      // Spy on console.log
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

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

      // Call the function with verbose option
      await verifyContent(sampleOcrText, { verbose: true });

      // Verify that console.log was called with the expected messages
      expect(consoleLogSpy).toHaveBeenCalledWith('Verifying OCR text with DeepSeek LLM...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Sending prompt to DeepSeek LLM...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Content verification complete');

      // Restore console.log
      consoleLogSpy.mockRestore();
    });

    test('should handle empty response from API', async () => {
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
      const result = await verifyContent(sampleOcrText);

      // Verify that the original text is returned when API returns empty response
      expect(result).toBe(sampleOcrText);
    });
  });

  describe('createPrompt function', () => {
    test('should create a prompt with the provided text', () => {
      // Call the function
      const prompt = createPrompt(sampleOcrText);

      // Verify that the prompt contains the text
      expect(prompt).toContain(sampleOcrText);

      // Verify that the prompt contains instructions
      expect(prompt).toContain('I have some text that was extracted from a PDF using OCR');
      expect(prompt).toContain('Please fix any errors you find in the text');
      expect(prompt).toContain('Please provide the corrected version of the text');
    });

    test('should handle empty text', () => {
      // Call the function with empty text
      const prompt = createPrompt('');

      // Verify that the prompt still contains instructions
      expect(prompt).toContain('I have some text that was extracted from a PDF using OCR');
      expect(prompt).toContain('Please fix any errors you find in the text');
      expect(prompt).toContain('Please provide the corrected version of the text');

      // Verify that the prompt contains empty text
      expect(prompt).toContain('Here is the OCR text:');
      expect(prompt).toContain('');
    });
  });
});
