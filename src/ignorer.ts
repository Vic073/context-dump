import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import type { ContextDumpConfig } from '../shared/types.js';
import { DEFAULT_IGNORES } from './constants/defaultIgnores.js';

export interface IgnoreRuleSource {
  rootDir: string;
  ignoreInstance: ReturnType<typeof ignore>;
}

export class CompositeIgnorer {
  private rules: IgnoreRuleSource[] = [];

  addRules(rootDir: string, patterns: string[]) {
    const ig = ignore();
    ig.add(patterns);
    this.rules.push({ rootDir, ignoreInstance: ig });
  }

  ignores(absolutePath: string): boolean {
    // Normalise separators to forward slashes for the ignore library
    for (const rule of this.rules) {
      const relativePath = path.relative(rule.rootDir, absolutePath);
      // If path is outside rootDir, this ignore instance doesn't apply to it
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        continue;
      }
      
      const normalizedPath = relativePath.split(path.sep).join('/');
      if (normalizedPath === '' || normalizedPath === '.') {
        continue;
      }

      if (rule.ignoreInstance.ignores(normalizedPath)) {
        return true;
      }
    }
    return false;
  }
}

export async function buildIgnorer(
  targetDir: string,
  config: ContextDumpConfig
): Promise<CompositeIgnorer> {
  const ignorer = new CompositeIgnorer();
  const absoluteTargetDir = path.resolve(targetDir);

  // 1. Add Default Exclusions (unless disabled)
  if (!config.noDefaults) {
    ignorer.addRules(absoluteTargetDir, DEFAULT_IGNORES);
  }

  // 2. Add gitignore rules from targetDir up to filesystem root
  let current = absoluteTargetDir;
  while (true) {
    const gitignorePath = path.join(current, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      try {
        const content = fs.readFileSync(gitignorePath, 'utf8');
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
        ignorer.addRules(current, lines);
      } catch (err) {
        console.warn(`Warning: Could not parse .gitignore at ${gitignorePath} — skipping`);
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  // 3. Add .contextdumpignore from targetDir root
  const contextIgnorePath = path.join(absoluteTargetDir, '.contextdumpignore');
  if (fs.existsSync(contextIgnorePath)) {
    try {
      const content = fs.readFileSync(contextIgnorePath, 'utf8');
      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
      ignorer.addRules(absoluteTargetDir, lines);
    } catch (err) {
      console.warn(`Warning: Could not parse .contextdumpignore at ${contextIgnorePath} — skipping`);
    }
  }

  // 4. Add CLI `--exclude` patterns (if present)
  if (config.exclude && config.exclude.length > 0) {
    ignorer.addRules(absoluteTargetDir, config.exclude);
  }

  // 5. Add custom ignore file (if present)
  if (config.ignoreFile) {
    const customIgnorePath = path.resolve(config.ignoreFile);
    if (fs.existsSync(customIgnorePath)) {
      try {
        const content = fs.readFileSync(customIgnorePath, 'utf8');
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
        ignorer.addRules(absoluteTargetDir, lines);
      } catch (err) {
        console.warn(`Warning: Could not parse custom ignore file at ${customIgnorePath} — skipping`);
      }
    } else {
      console.warn(`Warning: Custom ignore file not found at ${customIgnorePath} — skipping`);
    }
  }

  return ignorer;
}
