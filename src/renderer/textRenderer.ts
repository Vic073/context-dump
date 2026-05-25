import type { DumpMeta, ResolvedFile, ContextDumpConfig } from '../../shared/types.js';

export function renderText(
  meta: DumpMeta,
  tree: string,
  files: ResolvedFile[],
  config: ContextDumpConfig
): string {
  const parts: string[] = [];

  if (!config.noHeader) {
    parts.push(`Project: ${meta.project}`);
    parts.push(`Generated: ${meta.generatedAt}`);
    parts.push(`Files: ${meta.filesIncluded} included (${meta.filesScanned} scanned)`);
    parts.push(`Estimated tokens: ~${meta.estimatedTokens.toLocaleString()}`);
    if (meta.model) {
      const statusText = meta.withinLimit ? 'within limit' : 'exceeds limit';
      parts.push(`Model: ${meta.model} (limit: ${meta.modelLimit?.toLocaleString()}) - ${statusText}`);
    }
    parts.push('='.repeat(40) + '\n');
  }

  parts.push('File Tree:');
  parts.push(tree + '\n');

  if (!config.treeOnly && files.length > 0) {
    const includedFiles = files.filter(f => !f.skippedReason);
    if (includedFiles.length > 0) {
      parts.push('='.repeat(40) + '\n');
      parts.push('Files:\n');
      for (const file of includedFiles) {
        parts.push(`File: ${file.path}`);
        parts.push('-'.repeat(40));
        parts.push(file.content);
        parts.push('='.repeat(40) + '\n');
      }
    }
  }

  return parts.join('\n');
}
