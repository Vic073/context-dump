import fs from 'fs';
import type { ContextDumpConfig, WalkedFile, ResolvedFile } from '../shared/types.js';

async function checkIsBinary(absolutePath: string): Promise<boolean> {
  let fd: fs.promises.FileHandle | null = null;
  try {
    fd = await fs.promises.open(absolutePath, 'r');
    const buffer = Buffer.alloc(8192);
    const { bytesRead } = await fd.read(buffer, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }
    return false;
  } catch (err) {
    // If we can't open/read, treat as non-binary (reading will fail later and log warning)
    return false;
  } finally {
    if (fd) {
      await fd.close();
    }
  }
}

export async function resolveFiles(
  walkedFiles: WalkedFile[],
  config: ContextDumpConfig
): Promise<ResolvedFile[]> {
  const maxFileSizeKb = config.maxFileSizeKb ?? 500;
  const maxSizeBytes = maxFileSizeKb * 1024;

  const resolvedFiles: ResolvedFile[] = [];

  for (const file of walkedFiles) {
    const resolved: ResolvedFile = {
      ...file,
      content: '',
      estimatedTokens: 0,
    };

    // If already skipped (e.g. ignored), just keep it as-is
    if (resolved.skippedReason) {
      resolvedFiles.push(resolved);
      continue;
    }

    // Check file size
    if (resolved.sizeBytes > maxSizeBytes) {
      resolved.skippedReason = 'too-large';
      resolvedFiles.push(resolved);
      continue;
    }

    // Check if binary
    try {
      const isBinary = await checkIsBinary(resolved.absolutePath);
      if (isBinary) {
        resolved.isBinary = true;
        resolved.skippedReason = 'binary';
        resolvedFiles.push(resolved);
        continue;
      }
    } catch (err) {
      console.warn(`Warning: Cannot read metadata for ${resolved.path} — skipped.`);
      resolved.skippedReason = 'ignored';
      resolvedFiles.push(resolved);
      continue;
    }

    // Read text file contents
    try {
      const content = await fs.promises.readFile(resolved.absolutePath, 'utf8');
      resolved.content = content;
    } catch (err) {
      console.warn(`Warning: Cannot read file contents for ${resolved.path} — skipped.`);
      resolved.skippedReason = 'ignored';
    }

    resolvedFiles.push(resolved);
  }

  return resolvedFiles;
}
