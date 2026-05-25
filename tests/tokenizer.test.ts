import { describe, it, expect } from 'vitest';
import { estimateTokens, estimatePerFile } from '../src/tokenizer.js';
import type { ResolvedFile } from '../shared/types.js';

describe('Tokenizer', () => {
  it('should estimate tokens using tiktoken cl100k_base', () => {
    const text = 'Hello world! This is a test.';
    const count = estimateTokens(text);
    expect(count).toBeGreaterThan(0);
    // cl100k_base encoding:
    // 'Hello' (1), ' world' (1), '!' (1), ' This' (1), ' is' (1), ' a' (1), ' test' (1), '.' (1) = 8 tokens
    expect(count).toBe(8);
  });

  it('should return 0 for empty strings', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('should estimate tokens per file', () => {
    const files: ResolvedFile[] = [
      {
        path: 'src/cli.ts',
        absolutePath: '/project/src/cli.ts',
        extension: 'ts',
        sizeBytes: 100,
        isBinary: false,
        content: 'import { Command } from "commander";',
        estimatedTokens: 0,
      },
      {
        path: 'src/ignore.log',
        absolutePath: '/project/src/ignore.log',
        extension: 'log',
        sizeBytes: 200,
        isBinary: false,
        content: '',
        skippedReason: 'ignored',
        estimatedTokens: 0,
      }
    ];

    const map = estimatePerFile(files);
    expect(map.get('src/cli.ts')).toBeGreaterThan(0);
    expect(map.get('src/ignore.log')).toBe(0);
  });
});
