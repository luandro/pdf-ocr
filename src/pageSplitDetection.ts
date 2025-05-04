import dotenv from 'dotenv';
import { Together } from 'together-ai';
import { renderPdfToPng } from './renderPdfToPng';
import { VISION_MODEL, DEFAULT_MARGIN, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_TIMEOUT } from './constants';

// Load environment variables
dotenv.config();

/**
 * Options for page split detection
 */
export interface PageSplitDetectionOptions {
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
 * Result of page split detection
 */
export interface PageSplitDetectionResult {
  /** Whether the page needs to be split */
  needsSplitting: boolean;
  /** Margin value for splitting (if needed) */
  margin?: string;
  /** Explanation for the decision */
  explanation?: string;
}

/**
 * System prompt for the vision model
 */
const VISION_SYSTEM_PROMPT = `
You are an expert at analyzing PDF pages to determine if they need to be split.
Your task is to examine the image of a PDF page and determine if it contains two pages side by side that should be split.

Common indicators that a page needs splitting:
1. The page has a clear center line or margin dividing it into two halves
2. The page has two distinct columns of text that appear to be separate pages
3. The page is in a "book spread" format with two pages visible
4. There are page numbers in positions that suggest two pages (e.g., outer corners)

If the page needs splitting, you should also determine the appropriate margin value for splitting.
The margin value is used to crop the page into left and right halves.
`;

/**
 * Detects if a PDF page needs to be split using Together.ai's vision model
 * @param pdfBuffer - Buffer containing a single PDF page
 * @param options - Page split detection options
 * @returns Detection result with splitting decision and parameters
 * @throws Error if detection fails or API key is missing
 */
export async function detectPageSplit(
  pdfBuffer: Buffer,
  options: PageSplitDetectionOptions = {}
): Promise<PageSplitDetectionResult> {
  // Set default options
  const opts = {
    verbose: options.verbose ?? false,
    timeout: options.timeout ?? DEFAULT_TIMEOUT,
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    topP: options.topP ?? DEFAULT_TOP_P,
  };

  // Check if API key is set
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('TOGETHER_API_KEY environment variable is not set');
  }

  try {
    // Initialize Together client
    const together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });

    if (opts.verbose) {
      console.log('Analyzing PDF page for potential splitting...');
    }

    // Convert PDF to PNG for vision model
    const pngBuffer = await renderPdfToPng(pdfBuffer);

    // Convert PNG to base64
    const base64Image = pngBuffer.toString('base64');

    if (opts.verbose) {
      console.log('Sending page image to Together.ai vision model...');
    }

    // Call the Together.ai vision model
    const response = await together.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: VISION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this PDF page and determine if it needs to be split into two separate pages. If it needs splitting, provide a margin value (e.g., "-375") that would be appropriate for splitting the page. Respond in JSON format with fields: "needsSplitting" (boolean), "margin" (string, only if needsSplitting is true), and "explanation" (string).'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      top_p: opts.topP,
    });

    // Extract the response text
    const responseText = response.choices[0]?.message?.content || '';

    if (opts.verbose) {
      console.log('Vision model response:', responseText);
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (in case the model includes other text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);

      // Validate the response
      if (typeof jsonResponse.needsSplitting !== 'boolean') {
        throw new Error('Invalid response: needsSplitting field is missing or not a boolean');
      }

      // Create the result
      const result: PageSplitDetectionResult = {
        needsSplitting: jsonResponse.needsSplitting,
        explanation: jsonResponse.explanation || undefined
      };

      // Add margin if splitting is needed
      if (jsonResponse.needsSplitting && jsonResponse.margin) {
        result.margin = jsonResponse.margin;
      } else if (jsonResponse.needsSplitting) {
        // Default margin if not provided
        result.margin = DEFAULT_MARGIN;
      }

      if (opts.verbose) {
        console.log('Page split detection result:', result);
      }

      return result;
    } catch (parseError) {
      if (opts.verbose) {
        console.error('Failed to parse vision model response:', parseError);
      }

      // Fallback: try to determine from the text response
      const needsSplitting = responseText.toLowerCase().includes('yes') ||
                            responseText.toLowerCase().includes('needs splitting') ||
                            responseText.toLowerCase().includes('should be split');

      // Try to extract a margin value if present
      const marginMatch = responseText.match(/-?\d+/);
      const margin = marginMatch ? marginMatch[0] : DEFAULT_MARGIN;

      return {
        needsSplitting,
        margin: needsSplitting ? margin : undefined,
        explanation: 'Determined from text response (JSON parsing failed)'
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (opts.verbose) {
      console.error(`Page split detection failed: ${errorMessage}`);
    }

    // Return a default result (no splitting) on error
    return {
      needsSplitting: false,
      explanation: `Detection failed: ${errorMessage}`
    };
  }
}
