import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import type { ContextDumpConfig } from '../shared/types.js';
import { runOrchestrator } from './orchestrator.js';
import { writeOutput } from './writer.js';

function collectExclude(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

const DEFAULT_CONFIG_CONTENT = {
  model: 'claude',
  include: [],
  exclude: [],
  excludeExt: [],
  depth: 0,
  format: 'markdown',
  treeOnly: false,
  copy: false,
  maxFileSizeKb: 500,
  noHeader: false,
  noDefaults: false,
  followSymlinks: false,
  hardLimit: false,
  verbose: false,
};

const DEFAULT_IGNORE_CONTENT = `# Custom ignore patterns for ContextDump
# Matches .gitignore syntax.
# E.g.
# *.test.ts
# doc/
`;

async function handleInit() {
  const configPath = path.resolve('contextdump.config.json');
  const ignorePath = path.resolve('.contextdumpignore');

  const writeFiles = () => {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG_CONTENT, null, 2), 'utf8');
    fs.writeFileSync(ignorePath, DEFAULT_IGNORE_CONTENT, 'utf8');
    console.log(chalk.green('✓ Created contextdump.config.json and .contextdumpignore'));
  };

  if (fs.existsSync(configPath) || fs.existsSync(ignorePath)) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Configuration files already exist. Overwrite? (y/N): ', (answer) => {
      rl.close();
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        writeFiles();
      } else {
        console.log('Aborted.');
      }
    });
  } else {
    writeFiles();
  }
}

export async function runCli(): Promise<void> {
  const program = new Command();

  program
    .name('contextdump')
    .description('Pack project files and structure for AI context')
    .version('1.0.0');

  // Positional Argument
  program.argument('[directory]', 'Target directory to dump', '.');

  // Options
  program
    .option('-m, --model <name>', 'Target AI model for token limit display (claude | gpt-4o | gpt-4-turbo | gpt-3.5 | gemini-1.5-pro | llama3)')
    .option('-i, --include <exts>', 'Only include files with these extensions (comma-separated)')
    .option('-e, --exclude <pattern>', 'Exclude files matching this glob (repeatable)', collectExclude, [])
    .option('--exclude-ext <exts>', 'Exclude these extensions entirely (comma-separated)')
    .option('-d, --depth <n>', 'Max directory depth to traverse')
    .option('-f, --format <type>', 'Output format: markdown | text | json')
    .option('-o, --output <path>', 'Save output to this file path')
    .option('-c, --copy', 'Copy output to clipboard')
    .option('-t, --tree-only', 'Output file tree only, no file contents')
    .option('--max-file-size <kb>', 'Skip files larger than this size in KB (default: 500)')
    .option('--no-header', 'Suppress the metadata header block in output')
    .option('--no-defaults', 'Disable the built-in default ignore patterns')
    .option('--ignore-file <path>', 'Path to an additional ignore file')
    .option('--follow-symlinks', 'Follow symbolic links during traversal')
    .option('--hard-limit', 'Exit non-zero if token count exceeds model limit')
    .option('-v, --verbose', 'Show per-file token breakdown in summary');

  // Init subcommand
  program
    .command('init')
    .description('Create starter contextdump.config.json and .contextdumpignore')
    .action(async () => {
      await handleInit();
    });

  // Intercept the help or version command
  program.parse(process.argv);

  // If the command is 'init', commander already handled it and exited.
  // Otherwise, we process the main orchestrator task.
  const args = program.args;
  if (args[0] === 'init') {
    return;
  }

  const targetDir = args[0] || '.';
  const opts = program.opts();

  // Convert CLI options to ContextDumpConfig
  const cliConfig: ContextDumpConfig = {};

  if (opts.model) cliConfig.model = opts.model;
  if (opts.include) {
    cliConfig.include = opts.include.split(',').map((s: string) => s.trim());
  }
  if (opts.exclude && opts.exclude.length > 0) {
    cliConfig.exclude = opts.exclude;
  }
  if (opts.excludeExt) {
    cliConfig.excludeExt = opts.excludeExt.split(',').map((s: string) => s.trim());
  }
  if (opts.depth) {
    cliConfig.depth = parseInt(opts.depth, 10);
  }
  if (opts.format) {
    cliConfig.format = opts.format as 'markdown' | 'text' | 'json';
  }
  if (opts.output) cliConfig.output = opts.output;
  if (opts.copy) cliConfig.copy = true;
  if (opts.treeOnly) cliConfig.treeOnly = true;
  if (opts.maxFileSize) {
    cliConfig.maxFileSizeKb = parseFloat(opts.maxFileSize);
  }
  if (opts.header === false) {
    cliConfig.noHeader = true; // Commander maps --no-header to options.header = false
  }
  if (opts.defaults === false) {
    cliConfig.noDefaults = true; // Commander maps --no-defaults to options.defaults = false
  }
  if (opts.ignoreFile) cliConfig.ignoreFile = opts.ignoreFile;
  if (opts.followSymlinks) cliConfig.followSymlinks = true;
  if (opts.hardLimit) cliConfig.hardLimit = true;
  if (opts.verbose) cliConfig.verbose = true;

  try {
    const result = await runOrchestrator(targetDir, cliConfig);
    await writeOutput(result.renderedOutput, result.meta, result.files, {
      ...cliConfig,
      // Merge config loaded in orchestrator to writer for formatting verbose summary
      treeOnly: result.meta.filesIncluded === 0 && cliConfig.treeOnly,
    });

    // Hard limit handling
    if (cliConfig.hardLimit && result.meta.withinLimit === false) {
      console.error(chalk.red(`\nError: Estimated ${result.meta.estimatedTokens.toLocaleString()} tokens exceeds ${cliConfig.model}'s limit of ${result.meta.modelLimit?.toLocaleString()}.`));
      process.exit(1);
    }
  } catch (err: any) {
    if (err.message.startsWith('Warning:')) {
      console.warn(chalk.yellow(`\n${err.message}`));
    } else {
      console.error(chalk.red(`\nError: ${err.message}`));
      process.exit(1);
    }
  }
}
