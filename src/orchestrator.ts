import fs from 'fs';
import path from 'path';
import type { ContextDumpConfig, DumpResult, DumpMeta, ResolvedFile } from '../shared/types.js';
import { buildIgnorer } from './ignorer.js';
import { walkDirectory } from './walker.js';
import { resolveFiles } from './resolver.js';
import { buildTreeString } from './treeBuilder.js';
import { estimateTokens, estimatePerFile } from './tokenizer.js';
import { render } from './renderer/index.js';
import { MODEL_LIMITS } from './constants/modelLimits.js';

export async function runOrchestrator(
  targetDir: string,
  cliConfig: ContextDumpConfig
): Promise<DumpResult> {
  const startTime = Date.now();

  // 1. Resolve and Validate Target Directory
  const absoluteTargetDir = path.resolve(targetDir);
  if (!fs.existsSync(absoluteTargetDir)) {
    throw new Error(`Directory not found: ${targetDir}`);
  }
  
  const stats = await fs.promises.stat(absoluteTargetDir);
  if (!stats.isDirectory()) {
    throw new Error(`Path is a file. Provide a directory, or use --include to filter by extension.`);
  }

  // 2. Load Config from target directory and merge with CLI config
  // Note: We import loadConfig dynamically to avoid circular dependencies or import ordering issues
  const { loadConfig, mergeConfigs } = await import('./configLoader.js');
  const fileConfig = await loadConfig(absoluteTargetDir);
  const config = mergeConfigs(cliConfig, fileConfig);

  // 3. Build composite ignorer ruleset
  const ignorer = await buildIgnorer(absoluteTargetDir, config);

  // 4. Walk the directory
  const walkedFiles = await walkDirectory(absoluteTargetDir, ignorer, config);
  if (walkedFiles.length === 0) {
    throw new Error(`Warning: No files matched your filters. Output would be empty.`);
  }

  // 5. Resolve files (read content, binary/size checks)
  const resolvedFiles = await resolveFiles(walkedFiles, config);

  // Count files actually matched vs scanned
  const totalScanned = resolvedFiles.length;
  const skippedCount = resolvedFiles.filter(f => f.skippedReason !== undefined).length;
  const includedCount = totalScanned - skippedCount;

  if (includedCount === 0 && !config.treeOnly) {
    throw new Error(`Warning: No files matched your filters. Output would be empty.`);
  }

  // 6. Build the ASCII tree
  const projectName = path.basename(absoluteTargetDir) || 'root';
  const treeString = buildTreeString(resolvedFiles, projectName);

  // 7. Token counting
  let estimatedTokens = 0;
  if (config.treeOnly) {
    estimatedTokens = estimateTokens(treeString);
  } else {
    // Estimate each file's tokens
    for (const f of resolvedFiles) {
      if (!f.skippedReason) {
        f.estimatedTokens = estimateTokens(f.content);
        estimatedTokens += f.estimatedTokens;
      }
    }
    // Add tree's tokens
    estimatedTokens += estimateTokens(treeString);
  }

  // 8. Model limit check
  let modelLimit: number | undefined;
  let withinLimit: boolean | undefined;
  if (config.model) {
    modelLimit = MODEL_LIMITS[config.model];
    if (modelLimit !== undefined) {
      withinLimit = estimatedTokens <= modelLimit;
    }
  }

  const durationMs = Date.now() - startTime;

  // 9. Build Metadata
  const meta: DumpMeta = {
    project: projectName,
    generatedAt: new Date().toISOString(),
    targetDirectory: absoluteTargetDir,
    filesIncluded: config.treeOnly ? 0 : includedCount,
    filesScanned: totalScanned,
    filesSkipped: skippedCount,
    estimatedTokens,
    model: config.model,
    modelLimit,
    withinLimit,
    durationMs,
  };

  // 10. Render output
  const renderedOutput = render(meta, treeString, resolvedFiles, config);

  return {
    meta,
    tree: treeString,
    files: resolvedFiles,
    renderedOutput,
  };
}
