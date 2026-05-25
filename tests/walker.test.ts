import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { walkDirectory } from '../src/walker.js';
import { buildIgnorer } from '../src/ignorer.js';
import fs from 'fs';
import path from 'path';

describe('Walker', () => {
  const tempDir = path.resolve('tests-temp-dir');

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'file1.ts'), 'content1');
    fs.writeFileSync(path.join(tempDir, 'file2.js'), 'content2');
    fs.mkdirSync(path.join(tempDir, 'subdir'));
    fs.writeFileSync(path.join(tempDir, 'subdir', 'file3.json'), 'content3');
    fs.writeFileSync(path.join(tempDir, 'file.log'), 'log_content');
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should list files recursively and respect exclude extension options', async () => {
    const config = {
      excludeExt: ['log'],
      noDefaults: true,
    };
    const ignorer = await buildIgnorer(tempDir, config);
    const files = await walkDirectory(tempDir, ignorer, config);

    const relativePaths = files.map(f => f.path);
    expect(relativePaths).toContain('file1.ts');
    expect(relativePaths).toContain('file2.js');
    expect(relativePaths).toContain('subdir/file3.json');
    
    // The log file should be marked as ignored
    const logFile = files.find(f => f.path === 'file.log');
    expect(logFile).toBeDefined();
    expect(logFile?.skippedReason).toBe('ignored');
  });

  it('should filter by include extensions if configured', async () => {
    const config = {
      include: ['ts', 'json'],
      noDefaults: true,
    };
    const ignorer = await buildIgnorer(tempDir, config);
    const files = await walkDirectory(tempDir, ignorer, config);

    const includedFiles = files.filter(f => !f.skippedReason).map(f => f.path);
    expect(includedFiles).toContain('file1.ts');
    expect(includedFiles).toContain('subdir/file3.json');
    expect(includedFiles).not.toContain('file2.js');
  });
});
