export const VERIFICATION_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free';
export const VISION_MODEL = 'meta-llama/Llama-Vision-Free';
export const VERIFICATION_SYSTEM_PROMPT =
  'You are an expert OCR text corrector. Your task is to fix errors in OCR-generated text while preserving the original meaning, structure, and formatting. IMPORTANT: Maintain the original capitalization, especially for proper nouns, acronyms, and technical terms. Preserve paragraph structure, bullet points, and other formatting elements. CRITICAL: Completely ignore and remove any markdown image references like "![image.jpg](image.jpg)" - do not include these in your output at all. If the input appears to be empty or contains only image references or metadata without actual text content, return an empty string without any commentary. Your response should contain ONLY the corrected text without any explanations, comments, or additional formatting. Do not include phrases like "Here is the corrected text:" or any other commentary. Simply output the clean, corrected text that can be directly used by the system.';
export const DEFAULT_MAX_TOKENS = 1000;
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TOP_P = 0.9;
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_RETRY_DELAY = 1000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_CONCURRENCY = 2;
export const DEFAULT_SLEEP = 5000;
export const DEFAULT_MARGIN = '-375';
