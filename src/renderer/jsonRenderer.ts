import type { DumpMeta, ResolvedFile, ContextDumpConfig } from '../../shared/types.js';

export function renderJson(
  meta: DumpMeta,
  tree: string,
  files: ResolvedFile[],
  config: ContextDumpConfig
): string {
  const outputObj: Record<string, any> = {};

  if (!config.noHeader) {
    outputObj.meta = {
      project: meta.project,
      generatedAt: meta.generatedAt,
      targetDirectory: meta.targetDirectory,
      filesIncluded: meta.filesIncluded,
      filesScanned: meta.filesScanned,
      estimatedTokens: meta.estimatedTokens,
      model: meta.model,
      modelLimit: meta.modelLimit,
      withinLimit: meta.withinLimit,
    };
  }

  outputObj.tree = tree;

  if (config.treeOnly) {
    outputObj.files = [];
  } else {
    outputObj.files = files
      .filter(f => !f.skippedReason)
      .map(f => ({
        path: f.path,
        extension: f.extension,
        sizeBytes: f.sizeBytes,
        estimatedTokens: f.estimatedTokens,
        content: f.content,
      }));
  }

  return JSON.stringify(outputObj, null, 2);
}
