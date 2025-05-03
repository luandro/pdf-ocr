export const VERIFICATION_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free';
export const VERIFICATION_SYSTEM_PROMPT =
  'You are an expert OCR text corrector. Your task is to fix errors in OCR-generated text while preserving the original meaning and structure. IMPORTANT: Your response should contain ONLY the corrected text without any explanations, comments, or additional formatting. Do not include phrases like "Here is the corrected text:" or any other commentary. Simply output the clean, corrected text that can be directly used by the system.';
export const DEFAULT_MAX_TOKENS = 1000;
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TOP_P = 0.9;
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_RETRY_DELAY = 1000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_CONCURRENCY = 2;
export const DEFAULT_SLEEP = 5000;
