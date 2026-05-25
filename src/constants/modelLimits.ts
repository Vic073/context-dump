import type { ModelKey } from '../../shared/types.js';

export const MODEL_LIMITS: Record<ModelKey, number> = {
  'claude':           200_000,
  'claude-sonnet':    200_000,
  'gpt-4o':          128_000,
  'gpt-4-turbo':     128_000,
  'gpt-3.5':          16_385,
  'gemini-1.5-pro': 1_048_576,
  'gemini-2.0-flash':1_048_576,
  'llama3':            8_192,
};
