import path from 'path';
import fg from 'fast-glob';
import type { ContextDumpConfig, WalkedFile } from '../shared/types.js';
import type { CompositeIgnorer } from './ignorer.js';

export async function walkDirectory(
  targetDir: string,
  ignorer: CompositeIgnorer,
  config: ContextDumpConfig
): Promise<WalkedFile[]> {
  const absoluteTargetDir = path.resolve(targetDir);

  // Determine glob-level ignores to optimize performance.
  // We always want to avoid scanning .git and node_modules at the glob level to prevent hanging.
  const globIgnores = ['**/.git/**'];
  if (!config.noDefaults) {
    globIgnores.push('**/node_modules/**');
  }

  const entries = await fg('**/*', {
    cwd: absoluteTargetDir,
    dot: true,
    followSymbolicLinks: config.followSymlinks ?? false,
    deep: config.depth && config.depth > 0 ? config.depth : undefined,
    onlyFiles: true,
    stats: true,
    ignore: globIgnores,
  });

  const walkedFiles: WalkedFile[] = [];

  for (const entry of entries) {
    const relativePath = entry.path;
    const absolutePath = path.resolve(absoluteTargetDir, relativePath);
    const sizeBytes = entry.stats?.size ?? 0;

    // Get extension
    const extname = path.extname(relativePath).toLowerCase();
    const extension = extname.startsWith('.') ? extname.slice(1) : extname;

    let skippedReason: 'binary' | 'too-large' | 'ignored' | undefined;

    // 1. Check if ignored by ignore rules
    if (ignorer.ignores(absolutePath)) {
      skippedReason = 'ignored';
    }

    // 2. Check if filtered by --include extensions
    if (!skippedReason && config.include && config.include.length > 0) {
      const match = config.include.some(ext => {
        const cleanExt = ext.toLowerCase().trim();
        return extension === cleanExt;
      });
      if (!match) {
        skippedReason = 'ignored';
      }
    }

    // 3. Check if filtered by --exclude-ext extensions
    if (!skippedReason && config.excludeExt && config.excludeExt.length > 0) {
      const match = config.excludeExt.some(ext => {
        const cleanExt = ext.toLowerCase().trim();
        return extension === cleanExt;
      });
      if (match) {
        skippedReason = 'ignored';
      }
    }

    walkedFiles.push({
      path: relativePath,
      absolutePath,
      extension,
      sizeBytes,
      isBinary: false, // will be resolved in resolver
      skippedReason,
    });
  }

  // Stable alphabetical sort by path (directories first, then files)
  walkedFiles.sort((a, b) => {
    const aParts = a.path.split('/');
    const bParts = b.path.split('/');
    const minLength = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < minLength; i++) {
      if (aParts[i] !== bParts[i]) {
        const aIsDir = i < aParts.length - 1;
        const bIsDir = i < bParts.length - 1;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return aParts[i].localeCompare(bParts[i]);
      }
    }
    return aParts.length - bParts.length;
  });

  return walkedFiles;
}
