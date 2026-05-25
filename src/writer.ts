import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import clipboardy from 'clipboardy';
import type { DumpMeta, ResolvedFile, ContextDumpConfig } from '../shared/types.js';

export async function writeOutput(
  renderedOutput: string,
  meta: DumpMeta,
  files: ResolvedFile[],
  config: ContextDumpConfig
): Promise<void> {
  let outputDestinations: string[] = [];
  let clipboardFallback = false;

  // 1. Handle Clipboard Copy
  if (config.copy) {
    try {
      await clipboardy.write(renderedOutput);
      outputDestinations.push('clipboard');
    } catch (err) {
      console.error(chalk.yellow('\nWarning: Clipboard write failed. Falling back to stdout.'));
      clipboardFallback = true;
    }
  }

  // 2. Handle File Output
  if (config.output) {
    const absoluteOutputPath = path.resolve(config.output);
    try {
      await fs.promises.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
      await fs.promises.writeFile(absoluteOutputPath, renderedOutput, 'utf8');
      outputDestinations.push(`file (${config.output})`);
    } catch (err) {
      console.error(chalk.red(`\nError: Failed to write output to file at ${config.output}`));
      throw err;
    }
  }

  // 3. Handle Stdout Output
  // If no output flags are specified, or if clipboard copy fallback occurred
  if ((!config.copy && !config.output) || clipboardFallback) {
    process.stdout.write(renderedOutput);
    outputDestinations.push('stdout');
  } else if (config.copy && !config.output && !clipboardFallback) {
    // If copy was requested and succeeded, and no output file was specified,
    // we don't output contents to stdout.
  }

  // 4. Print Summary to Stderr
  const durationSec = (meta.durationMs / 1000).toFixed(2);
  const scanned = meta.filesScanned;
  const included = meta.filesIncluded;
  const skipped = meta.filesSkipped;

  // Count skipped subgroups
  let ignoredCount = 0;
  let binaryCount = 0;
  let tooLargeCount = 0;

  for (const f of files) {
    if (f.skippedReason === 'ignored') ignoredCount++;
    else if (f.skippedReason === 'binary') binaryCount++;
    else if (f.skippedReason === 'too-large') tooLargeCount++;
  }

  const skippedParts: string[] = [];
  if (ignoredCount > 0 || skipped > 0) skippedParts.push(`${ignoredCount} ignored`);
  if (binaryCount > 0 || skipped > 0) skippedParts.push(`${binaryCount} binary`);
  if (tooLargeCount > 0 || skipped > 0) skippedParts.push(`${tooLargeCount} too large`);
  const skippedBreakdown = skippedParts.length > 0 ? ` (${skippedParts.join(' · ')})` : '';

  const summary = [
    `  ${chalk.cyan('ContextDump')} ${chalk.dim('v1.0.0')}`,
    '',
    `  Scanned   ${chalk.white(scanned.toString())} files`,
    `  Included  ${chalk.green(included.toString())} files  (~${meta.estimatedTokens.toLocaleString()} tokens)`,
    `  Skipped   ${chalk.yellow(skipped.toString())} files${chalk.dim(skippedBreakdown)}`,
    '',
  ];

  if (meta.model) {
    const limitStr = meta.modelLimit?.toLocaleString() || '';
    if (meta.withinLimit) {
      summary.push(`  Model     ${chalk.blue(meta.model)} (${limitStr} token limit) ${chalk.green('✓ within limit')}`);
    } else {
      summary.push(`  Model     ${chalk.blue(meta.model)} (${limitStr} token limit) ${chalk.red('⚠ exceeds limit')}`);
    }
  }

  summary.push(`  Output    → ${chalk.magenta(outputDestinations.join(' & '))}`);
  summary.push('');
  summary.push(`  Done in ${durationSec}s`);
  summary.push('');

  process.stderr.write(summary.join('\n'));

  // If verbose and files have content, print per-file token breakdown
  if (config.verbose && !config.treeOnly) {
    const includedFiles = files.filter(f => !f.skippedReason);
    if (includedFiles.length > 0) {
      const sortedByTokens = [...includedFiles].sort((a, b) => b.estimatedTokens - a.estimatedTokens);
      process.stderr.write(`  ${chalk.underline('Per-File Token Breakdown:')}\n`);
      for (const f of sortedByTokens) {
        process.stderr.write(`    ${chalk.dim(f.estimatedTokens.toLocaleString().padStart(8))} tokens - ${f.path}\n`);
      }
      process.stderr.write('\n');
    }
  }
}
