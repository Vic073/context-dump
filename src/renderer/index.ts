import type { DumpMeta, ResolvedFile, ContextDumpConfig } from '../../shared/types.js';
import { renderMarkdown } from './markdownRenderer.js';
import { renderText } from './textRenderer.js';
import { renderJson } from './jsonRenderer.js';

export function render(
  meta: DumpMeta,
  tree: string,
  files: ResolvedFile[],
  config: ContextDumpConfig
): string {
  const format = config.format || 'markdown';
  switch (format) {
    case 'text':
      return renderText(meta, tree, files, config);
    case 'json':
      return renderJson(meta, tree, files, config);
    case 'markdown':
    default:
      return renderMarkdown(meta, tree, files, config);
  }
}
