import type { DumpMeta, ResolvedFile, ContextDumpConfig } from '../../shared/types.js';
import { getFenceLanguage } from '../constants/fenceMap.js';

export function renderMarkdown(
  meta: DumpMeta,
  tree: string,
  files: ResolvedFile[],
  config: ContextDumpConfig
): string {
  const parts: string[] = [];

  // Metadata Header Block
  if (!config.noHeader) {
    parts.push(`# ContextDump: ${meta.project}\n`);
    parts.push(`**Generated:** ${meta.generatedAt}`);
    parts.push(`**Files:** ${meta.filesIncluded} included (${meta.filesScanned} scanned)`);
    parts.push(`**Estimated tokens:** ~${meta.estimatedTokens.toLocaleString()}`);
    if (meta.model) {
      const statusSymbol = meta.withinLimit ? '✓' : '⚠';
      parts.push(`**Model:** ${meta.model} (limit: ${meta.modelLimit?.toLocaleString()}) ${statusSymbol}`);
    }
    parts.push('\n---\n');
  }

  // File Tree
  parts.push('## File Tree\n');
  parts.push('```');
  parts.push(tree);
  parts.push('```\n');

  // Files contents (omit if tree-only)
  if (!config.treeOnly && files.length > 0) {
    const includedFiles = files.filter(f => !f.skippedReason);
    if (includedFiles.length > 0) {
      parts.push('---\n');
      parts.push('## Files\n');
      for (const file of includedFiles) {
        parts.push(`### ${file.path}\n`);
        const lang = getFenceLanguage(file.path);
        parts.push(`\`\`\`${lang}`);
        parts.push(file.content);
        parts.push('```\n');
      }
    }
  }

  return parts.join('\n');
}
