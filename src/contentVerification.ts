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
 * @param previousPageText - Optional text from the previous page to provide context
 * @returns Improved text
 * @throws Error if verification fails or API key is missing
 */
export async function verifyContent(
  text: string,
  options: ContentVerificationOptions = {},
  previousPageText?: string
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
    const prompt = createPrompt(text, previousPageText);

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
    let improvedText = response.choices[0]?.message?.content || text;

    // Filter out markdown image references
    improvedText = improvedText.replace(/!\[.*?\]\(.*?\)/g, '');

    // Clean up any empty lines created by removing image references
    improvedText = improvedText.replace(/\n\s*\n/g, '\n\n').trim();

    // Post-process the response to handle cases where the LLM still returns a message about empty content
    if (improvedText.includes("There is no text to correct") ||
        improvedText.includes("image reference") ||
        improvedText.includes("does not contain any text") ||
        improvedText.includes("The page is empty") ||
        improvedText.includes("No text to correct") ||
        /!\[.*?\]\(.*?\)/.test(improvedText) ||
        improvedText.trim().length === 0) {
      improvedText = "";
    }

    if (opts.verbose) {
      console.log('Content verification complete');
      console.log(`Original text length: ${text.length}`);
      console.log(`Improved text length: ${improvedText.length}`);
      if (improvedText === "") {
        console.log('Empty content detected, returning empty string');
      }
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
 * @param previousPageText - Optional text from the previous page to provide context
 * @returns Prompt for the LLM
 */
function createPrompt(text: string, previousPageText?: string): string {
  // Base prompt
  let prompt = `
I have some text that was extracted from a PDF using OCR. The OCR process may have introduced errors, such as:
- Misrecognized characters
- Broken words
- Missing punctuation
- Incorrect formatting
- Garbled text

Please fix any errors you find in the text while preserving the original meaning and structure. If you encounter text that seems completely nonsensical, try to make a reasonable guess based on context, but don't invent new content.

IMPORTANT: Maintain the original capitalization, formatting, and paragraph structure as much as possible. Pay special attention to proper nouns, acronyms, and technical terms.

CRITICAL INSTRUCTION:
1. Completely ignore and remove any markdown image references like "![image.jpg](image.jpg)" - do not include these in your output at all.
2. If the input appears to be empty or contains only image references, metadata, or statements like "There is no text to correct" without actual text content, return an empty string without any commentary.
3. Do not return messages about the content being an image or empty - just return an empty string.
`;

  // Add previous page context if available
  if (previousPageText && previousPageText.trim().length > 0) {
    prompt += `
For additional context, here is the text from the previous page:

${previousPageText}

`;
  }

  // Add the current page text
  prompt += `
Here is the OCR text to correct:

${text}

Please provide the corrected version of the text.
`;

  return prompt;
}
