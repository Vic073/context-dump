import fs from 'fs';
import path from 'path';
import type { ContextDumpConfig } from '../shared/types.js';

export async function loadConfig(targetDir: string): Promise<ContextDumpConfig> {
  const absoluteTargetDir = path.resolve(targetDir);
  const configPath = path.join(absoluteTargetDir, 'contextdump.config.json');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const rawContent = await fs.promises.readFile(configPath, 'utf8');
    const parsed = JSON.parse(rawContent);

    // Validate and build ContextDumpConfig
    const config: ContextDumpConfig = {};

    if (parsed.model) config.model = parsed.model;
    if (Array.isArray(parsed.include)) config.include = parsed.include;
    if (Array.isArray(parsed.exclude)) config.exclude = parsed.exclude;
    if (Array.isArray(parsed.excludeExt)) config.excludeExt = parsed.excludeExt;
    if (typeof parsed.depth === 'number') config.depth = parsed.depth;
    if (parsed.format) config.format = parsed.format;
    if (typeof parsed.output === 'string') config.output = parsed.output;
    if (typeof parsed.copy === 'boolean') config.copy = parsed.copy;
    if (typeof parsed.treeOnly === 'boolean') config.treeOnly = parsed.treeOnly;
    if (typeof parsed.maxFileSizeKb === 'number') config.maxFileSizeKb = parsed.maxFileSizeKb;
    else if (typeof parsed.maxFileSize === 'number') config.maxFileSizeKb = parsed.maxFileSize; // handle maxFileSize in config
    if (typeof parsed.noHeader === 'boolean') config.noHeader = parsed.noHeader;
    if (typeof parsed.noDefaults === 'boolean') config.noDefaults = parsed.noDefaults;
    if (typeof parsed.ignoreFile === 'string') config.ignoreFile = parsed.ignoreFile;
    if (typeof parsed.followSymlinks === 'boolean') config.followSymlinks = parsed.followSymlinks;
    if (typeof parsed.hardLimit === 'boolean') config.hardLimit = parsed.hardLimit;
    if (typeof parsed.verbose === 'boolean') config.verbose = parsed.verbose;

    return config;
  } catch (err) {
    console.warn(`Warning: Could not parse contextdump.config.json at ${configPath} — ignoring`);
    return {};
  }
}

export function mergeConfigs(
  cliConfig: ContextDumpConfig,
  fileConfig: ContextDumpConfig
): ContextDumpConfig {
  return {
    ...fileConfig,
    ...cliConfig,
  };
}
