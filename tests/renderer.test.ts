import { describe, it, expect } from 'vitest';
import { render } from '../src/renderer/index.js';
import type { DumpMeta, ResolvedFile } from '../shared/types.js';

describe('Renderers', () => {
  const meta: DumpMeta = {
    project: 'test-project',
    generatedAt: '2026-05-25T12:00:00Z',
    targetDirectory: '/project',
    filesIncluded: 1,
    filesScanned: 2,
    filesSkipped: 1,
    estimatedTokens: 100,
    model: 'claude',
    modelLimit: 200000,
    withinLimit: true,
    durationMs: 150,
  };

  const files: ResolvedFile[] = [
    {
      path: 'index.js',
      absolutePath: '/project/index.js',
      extension: 'js',
      sizeBytes: 40,
      isBinary: false,
      content: 'console.log("hello");',
      estimatedTokens: 10,
    },
    {
      path: 'skipped.log',
      absolutePath: '/project/skipped.log',
      extension: 'log',
      sizeBytes: 100,
      isBinary: false,
      content: '',
      skippedReason: 'ignored',
      estimatedTokens: 0,
    }
  ];

  const tree = 'test-project/\n├── index.js\n└── skipped.log [ignored]';

  it('should render markdown format', () => {
    const md = render(meta, tree, files, { format: 'markdown' });
    expect(md).toContain('# ContextDump: test-project');
    expect(md).toContain('## File Tree');
    expect(md).toContain('## Files');
    expect(md).toContain('### index.js');
    expect(md).toContain('console.log("hello");');
    expect(md).not.toContain('### skipped.log'); // ignored files shouldn't be printed
  });

  it('should support --no-header in markdown format', () => {
    const md = render(meta, tree, files, { format: 'markdown', noHeader: true });
    expect(md).not.toContain('# ContextDump: test-project');
    expect(md).toContain('## File Tree');
  });

  it('should support --tree-only in markdown format', () => {
    const md = render(meta, tree, files, { format: 'markdown', treeOnly: true });
    expect(md).toContain('## File Tree');
    expect(md).not.toContain('## Files');
    expect(md).not.toContain('console.log("hello");');
  });

  it('should render JSON format', () => {
    const jsonStr = render(meta, tree, files, { format: 'json' });
    const obj = JSON.parse(jsonStr);
    expect(obj.meta.project).toBe('test-project');
    expect(obj.tree).toBe(tree);
    expect(obj.files).toHaveLength(1);
    expect(obj.files[0].path).toBe('index.js');
  });

  it('should render text format', () => {
    const txt = render(meta, tree, files, { format: 'text' });
    expect(txt).toContain('Project: test-project');
    expect(txt).toContain('File Tree:');
    expect(txt).toContain('File: index.js');
    expect(txt).toContain('console.log("hello");');
  });
});
