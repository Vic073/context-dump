import { get_encoding } from 'tiktoken';
import type { ResolvedFile } from '../shared/types.js';

let enc: ReturnType<typeof get_encoding> | null = null;

function getEncoder() {
  if (!enc) {
    enc = get_encoding('cl100k_base');
  }
  return enc;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  try {
    const encoder = getEncoder();
    return encoder.encode(text).length;
  } catch (err) {
    // Fallback: estimate ~4 chars per token if tokenizer fails
    return Math.ceil(text.length / 4);
  }
}

export function estimatePerFile(files: ResolvedFile[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const file of files) {
    if (file.skippedReason) {
      map.set(file.path, 0);
    } else {
      map.set(file.path, estimateTokens(file.content));
    }
  }
  return map;
}
