import dotenv from 'dotenv';
import { Together } from 'together-ai';
import { VERIFICATION_MODEL, VERIFICATION_SYSTEM_PROMPT } from './constants';

// Load environment variables
dotenv.config();

// Define the Together constructor type
interface TogetherConstructor {
  new(options: { apiKey: string }): Together;
}

/**
 * Options for content verification
 */
export interface ContentVerificationOptions {
  /** Whether to enable verbose logging (default: false) */
  verbose?: boolean;
  /** Timeout for the API request in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of tokens to generate (default: 1000) */
  maxTokens?: number;
  /** Temperature for text generation (default: 0.7) */
  temperature?: number;
  /** Top-p for text generation (default: 0.9) */
  topP?: number;
}

/**
 * Verifies and improves OCR text using Together.ai free LLM
 * @param text - The OCR text to verify and improve
 * @param options - Content verification options
 * @returns Improved text
 * @throws Error if verification fails or API key is missing
 */
export async function verifyContent(
  text: string,
  options: ContentVerificationOptions = {}
): Promise<string> {
  // Set default options
  const opts = {
    verbose: options.verbose ?? false,
    timeout: options.timeout ?? 30000,
    maxTokens: options.maxTokens ?? 1000,
    temperature: options.temperature ?? 0.7,
    topP: options.topP ?? 0.9,
  };

  // Check if API key is set
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('TOGETHER_API_KEY environment variable is not set');
  }

  // If text is empty, return empty string
  if (!text || text.trim().length === 0) {
    if (opts.verbose) {
      console.log('No text to verify');
    }
    return '';
  }

  try {
    // Initialize Together client
    const together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });

    if (opts.verbose) {
      console.log('Verifying OCR text with Together.ai free LLM...');
    }

    // Create the prompt for the LLM
    const prompt = createPrompt(text);

    if (opts.verbose) {
      console.log('Sending prompt to Together.ai free LLM...');
    }

    // Call the Together.ai free model
    const response = await together.chat.completions.create({
      model: VERIFICATION_MODEL,
      messages: [
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      top_p: opts.topP,
    });

    // Extract the improved text from the response
    const improvedText = response.choices[0]?.message?.content || text;

    if (opts.verbose) {
      console.log('Content verification complete');
      console.log(`Original text length: ${text.length}`);
      console.log(`Improved text length: ${improvedText.length}`);
    }

    return improvedText;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (opts.verbose) {
      console.error(`Content verification failed: ${errorMessage}`);
    }

    // If verification fails, return the original text
    return text;
  }
}

/**
 * Creates a prompt for the LLM to verify and improve OCR text
 * @param text - The OCR text to verify and improve
 * @returns Prompt for the LLM
 */
function createPrompt(text: string): string {
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
}
