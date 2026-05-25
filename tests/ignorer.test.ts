import { describe, it, expect, vi } from 'vitest';
import { CompositeIgnorer } from '../src/ignorer.js';
import path from 'path';

describe('CompositeIgnorer', () => {
  it('should ignore files matching added rules', () => {
    const ignorer = new CompositeIgnorer();
    const root = path.resolve('/project');
    ignorer.addRules(root, ['*.log', 'temp/']);

    expect(ignorer.ignores(path.join(root, 'error.log'))).toBe(true);
    expect(ignorer.ignores(path.join(root, 'temp', 'file.txt'))).toBe(true);
    expect(ignorer.ignores(path.join(root, 'src', 'main.ts'))).toBe(false);
  });

  it('should handle nested rules relative to their roots', () => {
    const ignorer = new CompositeIgnorer();
    const root = path.resolve('/project');
    const subRoot = path.resolve('/project/src');

    ignorer.addRules(root, ['build/']);
    ignorer.addRules(subRoot, ['local/']);

    expect(ignorer.ignores(path.join(root, 'build', 'out.js'))).toBe(true);
    expect(ignorer.ignores(path.join(subRoot, 'local', 'data.json'))).toBe(true);
    expect(ignorer.ignores(path.join(root, 'local', 'data.json'))).toBe(false); // only ignored inside /project/src
  });
});
