import dotenv from 'dotenv';
import { Together } from 'together-ai';
import { renderPdfToPng } from './renderPdfToPng';
import { VISION_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_TIMEOUT } from './constants';

// Load environment variables
dotenv.config();

/**
 * Options for page content detection
 */
export interface PageContentDetectionOptions {
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
 * Result of page content detection
 */
export interface PageContentDetectionResult {
  /** The type of content detected in the page */
  contentType: 'text' | 'image' | 'empty';
  /** Explanation for the decision */
  explanation?: string;
}

/**
 * System prompt for the vision model
 */
const VISION_SYSTEM_PROMPT = `
You are an expert at analyzing PDF pages to determine their content type.
Your task is to examine the image of a PDF page and determine if it:
1. Contains meaningful text that should be processed with OCR
2. Contains only images without meaningful text
3. Is empty or has no significant content (blank page, page with only decorative elements, etc.)

For each page, you should categorize it into one of these types:
- "text": The page contains meaningful text that should be processed with OCR
- "image": The page contains only images without meaningful text
- "empty": The page is empty or has no significant content

Be careful to distinguish between:
- Pages with actual text content that should be OCR'd
- Pages with only images (photos, diagrams, charts without significant text)
- Pages that are empty or nearly empty (blank pages, pages with only page numbers or headers)
`;

/**
 * Detects the content type of a PDF page using Together.ai's vision model
 * @param pdfBuffer - Buffer containing a single PDF page
 * @param options - Page content detection options
 * @returns Detection result with content type and explanation
 * @throws Error if detection fails or API key is missing
 */
export async function detectPageContent(
  pdfBuffer: Buffer,
  options: PageContentDetectionOptions = {}
): Promise<PageContentDetectionResult> {
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
      console.log('Analyzing PDF page to determine content type...');
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
              text: 'Analyze this PDF page and determine if it contains meaningful text, only images without text, or is empty/blank. Respond in JSON format with fields: "contentType" (one of: "text", "image", "empty") and "explanation" (string explaining your decision).'
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
      if (!['text', 'image', 'empty'].includes(jsonResponse.contentType)) {
        throw new Error('Invalid response: contentType field is missing or invalid');
      }
      
      // Create the result
      const result: PageContentDetectionResult = {
        contentType: jsonResponse.contentType as 'text' | 'image' | 'empty',
        explanation: jsonResponse.explanation || undefined
      };
      
      if (opts.verbose) {
        console.log('Page content detection result:', result);
      }
      
      return result;
    } catch (parseError) {
      if (opts.verbose) {
        console.error('Failed to parse vision model response:', parseError);
      }
      
      // Fallback: try to determine from the text response
      let contentType: 'text' | 'image' | 'empty' = 'text'; // Default to text
      
      const lowerResponse = responseText.toLowerCase();
      if (lowerResponse.includes('empty') || 
          lowerResponse.includes('blank') || 
          lowerResponse.includes('no content')) {
        contentType = 'empty';
      } else if (lowerResponse.includes('image only') || 
                lowerResponse.includes('only image') || 
                lowerResponse.includes('no text')) {
        contentType = 'image';
      }
      
      return {
        contentType,
        explanation: 'Determined from text response (JSON parsing failed)'
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (opts.verbose) {
      console.error(`Page content detection failed: ${errorMessage}`);
    }

    // Return a default result (assume text) on error
    return {
      contentType: 'text',
      explanation: `Detection failed: ${errorMessage}`
    };
  }
}
