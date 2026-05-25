# Software Requirements Specification (SRS)

## Project: ContextDump — Repo-to-AI-Context CLI

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2026-05-25  
**Author:** ContextDump Core Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [General Description](#2-general-description)
3. [System Features & Functional Requirements](#3-system-features--functional-requirements)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Models & Output Format Reference](#6-data-models--output-format-reference)
7. [Error Handling & Edge Cases](#7-error-handling--edge-cases)
8. [MVP Scope & Phase Roadmap](#8-mvp-scope--phase-roadmap)
9. [Architecture Blueprint](#9-architecture-blueprint)
10. [Glossary](#10-glossary)

---

## 1. Introduction

### 1.1 Purpose

This document specifies all software requirements for **ContextDump**, a local developer CLI tool that walks a project directory, respects ignore rules, and outputs a single structured markdown file containing the file tree and all relevant file contents — ready to paste directly into an AI chat interface (Claude, ChatGPT, Gemini, etc.).

It serves as the single source of truth for developers building, testing, and extending ContextDump.

### 1.2 Problem Statement

Developers using AI coding assistants frequently need to give the model context about their codebase. The current workflow is:
- Manually copy-paste individual files one at a time
- Hope you didn't miss an important file
- Accidentally include irrelevant noise (build outputs, lock files, test fixtures)
- Have no idea how many tokens you're burning until the model cuts off

ContextDump eliminates this friction with a single command.

```bash
contextdump ./src --copy
# → Walks src/, builds structured markdown, copies to clipboard
# → Paste directly into Claude, ChatGPT, or any AI tool
```

### 1.3 Scope

**In scope:**
- Directory traversal with configurable depth
- `.gitignore` and `.contextdumpignore` respect
- File extension filtering (include/exclude)
- Output as markdown (default), plain text, or JSON
- Token count estimation with per-model limits
- Clipboard copy
- Save to output file
- Tree-only mode (structure without file contents)
- Config file support (`contextdump.config.json`)
- npm global install + single binary distribution

**Out of scope (for MVP):**
- Interactive TUI (terminal UI with checkboxes) — Phase 2
- Web UI — Phase 3
- Git-aware diffing (only dump changed files) — Phase 2
- Direct API integration (send dump directly to AI API) — Phase 3
- VS Code extension — Phase 3

### 1.4 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| Context window | The maximum number of tokens an LLM can process in a single request |
| Token | The unit LLMs use to measure text length — roughly 4 characters or ¾ of a word |
| Dump | The full structured output produced by ContextDump for a given directory |
| Tree | A visual representation of a directory's file and folder hierarchy |
| `.contextdumpignore` | A project-level ignore file following `.gitignore` syntax, specific to ContextDump |
| Ignore rules | Combined rules from `.gitignore`, `.contextdumpignore`, default exclusions, and CLI flags |
| fast-glob | A high-performance file globbing library for Node.js |
| ignore | npm library that parses and applies `.gitignore`-syntax rules |
| tiktoken | OpenAI's tokenizer library; used here for token count estimation |
| clipboardy | Cross-platform clipboard read/write library for Node.js |

### 1.5 References

- [fast-glob](https://github.com/mrmlnc/fast-glob)
- [ignore](https://github.com/kaelzhang/node-ignore)
- [tiktoken (js)](https://github.com/dqbd/tiktoken)
- [clipboardy](https://github.com/sindresorhus/clipboardy)
- [commander](https://github.com/tj/commander.js)
- [chalk](https://github.com/chalk/chalk)
- [TypeScript](https://www.typescriptlang.org/docs)

---

## 2. General Description

### 2.1 Product Perspective

ContextDump is a standalone local CLI tool with zero runtime dependencies after install. The user runs it from any directory; it produces a single output (clipboard, stdout, or file). No server, no account, no cloud.

```
Developer terminal
       │
       ▼
$ contextdump ./src --model claude --copy
       │
       ├─ 1. Load config + CLI flags
       ├─ 2. Walk directory tree
       ├─ 3. Apply ignore rules
       ├─ 4. Filter by extension
       ├─ 5. Read file contents
       ├─ 6. Count tokens
       └─ 7. Render output
              │
              ├─ --copy     → clipboard
              ├─ --output   → file on disk
              └─ (default)  → stdout
```

### 2.2 Product Functions

| Function | Description |
|---|---|
| Directory Walking | Recursively traverses a target directory up to a configurable depth |
| Ignore Rule Application | Merges `.gitignore`, `.contextdumpignore`, default exclusions, and CLI-supplied patterns |
| Extension Filtering | Includes or excludes files based on extension lists |
| Token Counting | Estimates token usage using a cl100k-compatible tokenizer |
| Model Limit Checking | Warns (or hard-stops) when estimated tokens exceed the selected model's context window |
| Markdown Rendering | Produces a structured markdown output with file tree and fenced code blocks |
| Clipboard Copy | Writes the final output directly to the system clipboard |
| File Output | Saves the dump to a specified file path |
| Tree-Only Mode | Outputs only the file tree structure, no file contents |
| Config File | Reads project-level defaults from `contextdump.config.json` |

### 2.3 User Classes

**Solo Developer (primary user)**
- Frequently pastes code into AI chat tools
- Wants a fast, zero-config way to dump a folder and copy to clipboard
- Cares about token budget — doesn't want the model to cut off mid-context

**Team Lead / Architect**
- Wants to dump specific subdirectories for architectural review conversations
- May configure a shared `.contextdumpignore` committed to the repo
- Values consistent output format across team members

**QA / Open Source Contributor**
- Needs to provide a clean reproduction context to an AI or in a GitHub issue
- Uses `--tree-only` to share project structure without exposing code content

### 2.4 Assumptions and Dependencies

- Node.js v18+ is installed.
- The user has read access to the target directory.
- Token counting is an estimate — not guaranteed to match any specific LLM's exact tokenizer.
- Clipboard access requires a supported OS environment (macOS, Linux with `xclip`/`xsel`, Windows).
- Binary/non-text files (images, fonts, compiled artifacts) are skipped by default.

### 2.5 Constraints

- Must complete a full dump of a 500-file TypeScript project in under 3 seconds.
- Output must be valid markdown renderable in any standard markdown viewer.
- Must run without internet access after installation.
- Must not read or transmit file contents anywhere — purely local operation.
- Global install footprint must be under 20MB (post-install with all dependencies).

---

## 3. System Features & Functional Requirements

> Priority: **MUST** = required for MVP, **SHOULD** = high value but deferrable, **MAY** = stretch goal.

---

### 3.1 Directory Traversal

**FR-1.1 (MUST):** The CLI must accept a target directory as a positional argument. If omitted, it defaults to the current working directory.

```bash
contextdump           # defaults to ./
contextdump ./src
contextdump /absolute/path/to/project
```

**FR-1.2 (MUST):** Traversal must be recursive by default. A `--depth N` flag must limit traversal to N levels deep from the target root (default: unlimited).

**FR-1.3 (MUST):** The traversal must skip symlinks by default to prevent infinite loops. A `--follow-symlinks` flag may opt-in.

**FR-1.4 (MUST):** The tool must not crash if it encounters a directory it cannot read (permissions). It must log a warning and continue.

---

### 3.2 Ignore Rules

**FR-2.1 (MUST):** The tool must automatically apply `.gitignore` rules found at the target directory root and any parent `.gitignore` files up to the filesystem root (standard git ignore behaviour).

**FR-2.2 (MUST):** The tool must apply a `.contextdumpignore` file if found in the target directory, using identical syntax to `.gitignore`. This file is project-specific and should be committed to the repo.

**FR-2.3 (MUST):** The following patterns must be excluded by default (hardcoded baseline, overridable via `--no-defaults` flag):

```
node_modules/
.git/
dist/
build/
out/
coverage/
.next/
.nuxt/
.cache/
*.lock
*.log
*.map
*.min.js
*.min.css
.DS_Store
Thumbs.db
```

**FR-2.4 (MUST):** A `--exclude <pattern>` CLI flag must add additional glob patterns to the ignore list. Repeatable: `--exclude "*.test.ts" --exclude "**/__fixtures__/**"`.

**FR-2.5 (SHOULD):** A `--ignore-file <path>` flag should allow pointing to an arbitrary ignore file outside the project directory.

---

### 3.3 File Extension Filtering

**FR-3.1 (MUST):** A `--include <extensions>` flag must restrict output to files matching a comma-separated list of extensions.

```bash
contextdump --include "ts,tsx,json"
```

**FR-3.2 (MUST):** A `--exclude-ext <extensions>` flag must additionally exclude specific extensions beyond the default ignore rules.

**FR-3.3 (MUST):** Binary files must be detected and skipped automatically. A file is considered binary if it contains a null byte (`\0`) in its first 8KB. Binary files must appear in the file tree but not have their contents included, with a `[binary file — skipped]` note.

**FR-3.4 (SHOULD):** The tool should skip files larger than a configurable size limit. Default: **500KB per file**. Overridable via `--max-file-size <KB>`. Skipped files must be noted in the tree.

---

### 3.4 Token Counting

**FR-4.1 (MUST):** After building the output, the tool must display an estimated token count in the terminal summary.

**FR-4.2 (MUST):** A `--model <name>` flag must select a target model and display its context window limit alongside the estimate:

| Model Key | Context Limit |
|---|---|
| `claude` | 200,000 tokens |
| `claude-sonnet` | 200,000 tokens |
| `gpt-4o` | 128,000 tokens |
| `gpt-4-turbo` | 128,000 tokens |
| `gpt-3.5` | 16,385 tokens |
| `gemini-1.5-pro` | 1,048,576 tokens |
| `gemini-2.0-flash` | 1,048,576 tokens |
| `llama3` | 8,192 tokens |

**FR-4.3 (MUST):** If estimated tokens exceed the model's context window, the tool must display a prominent warning:

```
⚠  Warning: Estimated 142,000 tokens exceeds gpt-4o's context window (128,000).
   Consider: --depth 2, --include "ts,tsx", or --tree-only
```

**FR-4.4 (SHOULD):** A `--hard-limit` flag should cause the tool to exit with a non-zero code (rather than warn) when the token limit is exceeded.

**FR-4.5 (SHOULD):** The tool should display a per-file token breakdown in a `--verbose` summary, sorted descending by token count, so users know which files to exclude first.

---

### 3.5 Output Rendering

**FR-5.1 (MUST):** The default output format must be **markdown** with:
- A header block (project name, generation timestamp, file count, token estimate)
- A fenced file tree section
- One fenced code block per included file, with language inferred from extension

**FR-5.2 (MUST):** A `--format <type>` flag must support three output formats:
- `markdown` (default) — see Section 6.1
- `text` — plain text, no markdown fences
- `json` — structured JSON, see Section 6.2

**FR-5.3 (MUST):** A `--tree-only` flag must output only the file tree section, with no file contents. Token estimate in summary reflects tree text only.

**FR-5.4 (MUST):** File paths in the output must be relative to the target directory root, not absolute paths.

**FR-5.5 (SHOULD):** A `--no-header` flag should suppress the metadata header block for minimal output.

**FR-5.6 (SHOULD):** Files in the output should be sorted: directories first, then files, both alphabetically. Sort order must be stable across runs.

---

### 3.6 Output Destinations

**FR-6.1 (MUST):** By default the rendered output is written to **stdout**, so it can be piped freely:

```bash
contextdump ./src | pbcopy        # manual clipboard on macOS
contextdump ./src > context.md    # manual file redirect
```

**FR-6.2 (MUST):** A `--copy` flag must write the output directly to the system clipboard using `clipboardy`, in addition to printing the terminal summary.

**FR-6.3 (MUST):** An `--output <path>` flag must write the rendered output to a file at the given path. If the file exists, it must be overwritten. Directories in the path are created if they don't exist.

**FR-6.4 (SHOULD):** `--copy` and `--output` may be combined — both destination types receive the same output simultaneously.

---

### 3.7 Configuration File

**FR-7.1 (SHOULD):** The tool should read a `contextdump.config.json` file from the target directory (or CWD if no target is given):

```json
{
  "model": "claude",
  "include": ["ts", "tsx", "json", "md"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"],
  "depth": 5,
  "maxFileSize": 200,
  "treeOnly": false,
  "copy": false,
  "format": "markdown"
}
```

**FR-7.2 (SHOULD):** CLI flags must take precedence over config file values, which take precedence over defaults.

**FR-7.3 (SHOULD):** A `contextdump init` subcommand should generate a starter `contextdump.config.json` and `.contextdumpignore` in the current directory.

---

### 3.8 Terminal Summary

**FR-8.1 (MUST):** After running, the tool must print a summary to **stderr** (keeping stdout clean for piping) containing:
- Number of files included vs total files scanned
- Number of files skipped (binary, too large, ignored)
- Estimated token count
- Token limit warning if applicable
- Output destination (clipboard / file / stdout)
- Time taken

Example:
```
  ContextDump v1.0.0

  Scanned   87 files
  Included  34 files  (~28,450 tokens)
  Skipped   53 files  (42 ignored · 8 binary · 3 too large)

  Model     claude (200,000 token limit) ✓ within limit

  Output    → clipboard

  Done in 0.31s
```

---

## 4. External Interface Requirements

### 4.1 CLI Interface — Full Flag Reference

```
Usage: contextdump [directory] [options]

Arguments:
  directory              Target directory to dump (default: current working directory)

Options:
  -m, --model <name>         Target AI model for token limit display
                             (claude | gpt-4o | gpt-4-turbo | gpt-3.5 | gemini-1.5-pro | llama3)
  -i, --include <exts>       Only include files with these extensions (comma-separated)
                             Example: --include "ts,tsx,json"
  -e, --exclude <pattern>    Exclude files matching this glob (repeatable)
                             Example: --exclude "**/*.test.ts"
      --exclude-ext <exts>   Exclude these extensions entirely (comma-separated)
  -d, --depth <n>            Max directory depth to traverse (default: unlimited)
  -f, --format <type>        Output format: markdown | text | json  (default: markdown)
  -o, --output <path>        Save output to this file path
  -c, --copy                 Copy output to clipboard
  -t, --tree-only            Output file tree only, no file contents
      --max-file-size <kb>   Skip files larger than this size in KB (default: 500)
      --no-header            Suppress the metadata header block in output
      --no-defaults          Disable the built-in default ignore patterns
      --ignore-file <path>   Path to an additional ignore file
      --follow-symlinks      Follow symbolic links during traversal
      --hard-limit           Exit non-zero if token count exceeds model limit
  -v, --verbose              Show per-file token breakdown in summary
  -h, --help                 Display this help message
      --version              Display version number

Subcommands:
  contextdump init           Create starter contextdump.config.json and .contextdumpignore
```

### 4.2 Language Extension → Code Fence Mapping

The renderer uses this table to add syntax highlighting hints to fenced code blocks:

| Extension | Fence Language |
|---|---|
| `.ts` | `typescript` |
| `.tsx` | `tsx` |
| `.js` | `javascript` |
| `.jsx` | `jsx` |
| `.json` | `json` |
| `.md` | `markdown` |
| `.html` | `html` |
| `.css` | `css` |
| `.scss` | `scss` |
| `.py` | `python` |
| `.rb` | `ruby` |
| `.go` | `go` |
| `.rs` | `rust` |
| `.java` | `java` |
| `.kt` | `kotlin` |
| `.swift` | `swift` |
| `.sh` | `bash` |
| `.yaml` / `.yml` | `yaml` |
| `.toml` | `toml` |
| `.sql` | `sql` |
| `.prisma` | `prisma` |
| `.graphql` | `graphql` |
| `.env*` | `bash` |
| *(unknown)* | *(no language hint)* |

### 4.3 Software Dependencies

**Runtime dependencies:**

| Package | Version | Role |
|---|---|---|
| `commander` | ^12 | CLI argument and subcommand parsing |
| `fast-glob` | ^3 | High-performance file system traversal and glob matching |
| `ignore` | ^5 | `.gitignore`-syntax rule parsing and application |
| `clipboardy` | ^4 | Cross-platform clipboard write (`--copy` flag) |
| `chalk` | ^5 | Terminal colour output in summary |
| `tiktoken` | ^1 | Token count estimation (cl100k_base encoding) |

**Dev dependencies:**

| Package | Role |
|---|---|
| `typescript` | TypeScript compiler |
| `tsx` | Run `.ts` files directly (dev + watch) |
| `@types/node` | Node.js type definitions |
| `vitest` | Unit test runner |

**Node.js requirement:** v18+

**Package.json scripts:**

```json
{
  "scripts": {
    "dev": "tsx watch src/cli.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/cli.js",
    "test": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "bin": {
    "contextdump": "./dist/bin/contextdump.js"
  }
}
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Requirement |
|---|---|
| Dump of 500-file TypeScript project | < 3 seconds total |
| Dump of 100-file project | < 1 second total |
| Memory usage | < 150MB for projects up to 10,000 files |
| Token counting overhead | < 500ms for outputs up to 200,000 tokens |

### 5.2 Usability

- Installation: `npm install -g contextdump` — nothing else.
- The most common use case (`contextdump --copy`) must work with no config, no flags beyond `--copy`.
- Warning messages must suggest concrete remediation steps, not just state the problem.
- `--help` output must fit in a standard 80-column terminal without wrapping.

### 5.3 Reliability

- Must never read or write files outside the target directory tree.
- Must not crash on unreadable files or directories — warn and continue.
- Token counting must be best-effort; a clear `~` prefix must indicate the value is an estimate.
- Must produce identical output for identical input on repeated runs (deterministic).
- Must handle empty directories, empty files, and directories with only ignored files gracefully.

### 5.4 Maintainability

- Source must be modular: walker, ignorer, renderer, tokenizer, clipboardWriter, and config loader as separate modules.
- The extension-to-fence-language map (Section 4.2) must live in a single file (`fenceMap.ts`).
- The model context window table (FR-4.2) must live in a single file (`modelLimits.ts`).
- All modules must be independently unit-testable.

### 5.5 Portability

- Must run on macOS, Linux, and Windows (WSL2 acceptable for Windows clipboard).
- Must not depend on any native compiled binaries.
- Clipboard support must degrade gracefully — if `clipboardy` fails (e.g., headless Linux server), print a clear error and fall back to stdout output.

### 5.6 Privacy

- The tool must never make any network requests. Zero telemetry, zero analytics.
- File contents must never leave the local machine except via explicit user action (clipboard paste, file write, stdout pipe).

---

## 6. Data Models & Output Format Reference

### 6.1 Markdown Output Format

```markdown
# ContextDump: my-project

**Generated:** 2026-05-25T14:32:10Z
**Files:** 34 included (87 scanned)
**Estimated tokens:** ~28,450
**Model:** claude (limit: 200,000) ✓

---

## File Tree

```
my-project/
├── src/
│   ├── cli.ts
│   ├── walker.ts
│   ├── renderer.ts
│   └── tokenizer.ts
├── shared/
│   └── types.ts
├── package.json
└── tsconfig.json
```

---

## Files

### src/cli.ts

```typescript
import { Command } from 'commander';
// ... file contents ...
```

### src/walker.ts

```typescript
import fg from 'fast-glob';
// ... file contents ...
```

### package.json

```json
{
  "name": "contextdump",
  ...
}
```
```

### 6.2 JSON Output Format

```json
{
  "meta": {
    "project": "my-project",
    "generatedAt": "2026-05-25T14:32:10Z",
    "targetDirectory": "/Users/dev/my-project",
    "filesIncluded": 34,
    "filesScanned": 87,
    "estimatedTokens": 28450,
    "model": "claude",
    "modelLimit": 200000,
    "withinLimit": true
  },
  "tree": "my-project/\n├── src/\n│   ├── cli.ts\n...",
  "files": [
    {
      "path": "src/cli.ts",
      "extension": "ts",
      "sizeBytes": 2048,
      "estimatedTokens": 512,
      "content": "import { Command } from 'commander';\n..."
    }
  ]
}
```

### 6.3 Internal TypeScript Types

```typescript
// shared/types.ts

export interface ContextDumpConfig {
  model?: ModelKey;
  include?: string[];
  exclude?: string[];
  excludeExt?: string[];
  depth?: number;
  format?: 'markdown' | 'text' | 'json';
  output?: string;
  copy?: boolean;
  treeOnly?: boolean;
  maxFileSizeKb?: number;
  noHeader?: boolean;
  noDefaults?: boolean;
  ignoreFile?: string;
  followSymlinks?: boolean;
  hardLimit?: boolean;
  verbose?: boolean;
}

export type ModelKey =
  | 'claude'
  | 'claude-sonnet'
  | 'gpt-4o'
  | 'gpt-4-turbo'
  | 'gpt-3.5'
  | 'gemini-1.5-pro'
  | 'gemini-2.0-flash'
  | 'llama3';

export interface WalkedFile {
  path: string;           // relative to target root
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  isBinary: boolean;
  skippedReason?: 'binary' | 'too-large' | 'ignored';
}

export interface ResolvedFile extends WalkedFile {
  content: string;
  estimatedTokens: number;
}

export interface DumpResult {
  meta: DumpMeta;
  tree: string;
  files: ResolvedFile[];
  renderedOutput: string;
}

export interface DumpMeta {
  project: string;
  generatedAt: string;
  targetDirectory: string;
  filesIncluded: number;
  filesScanned: number;
  filesSkipped: number;
  estimatedTokens: number;
  model?: ModelKey;
  modelLimit?: number;
  withinLimit?: boolean;
  durationMs: number;
}
```

---

## 7. Error Handling & Edge Cases

| Scenario | Expected Behaviour |
|---|---|
| Target directory does not exist | Exit: `Error: Directory not found: ./src` |
| Target path is a file, not a directory | Exit: `Error: Path is a file. Provide a directory, or use --include to filter by extension.` |
| No files match after applying all filters | Exit with warning: `Warning: No files matched your filters. Output would be empty.` |
| All files exceed `--max-file-size` | Same as above — warn and exit cleanly |
| `.gitignore` is malformed | Log `Warning: Could not parse .gitignore — skipping` and continue without it |
| `.contextdumpignore` is not found | Silently skip — it is optional |
| `--copy` fails (no clipboard access) | Log `Warning: Clipboard write failed. Falling back to stdout.` and write to stdout |
| `--output` path directory does not exist | Create parent directories automatically; exit with error only if creation fails |
| File read permission denied | Log `Warning: Cannot read [path] — skipped.` and continue |
| Token count exceeds model limit + `--hard-limit` | Exit with code 1 and the warning from FR-4.3 |
| `contextdump init` run in directory with existing config | Prompt: `contextdump.config.json already exists. Overwrite? (y/N)` |
| Binary file encountered | Include in tree with `[binary — skipped]` annotation; do not read contents |
| File grows during read (race condition) | Read only the bytes available at open time; do not crash |

---

## 8. MVP Scope & Phase Roadmap

### Phase 1 — MVP (Core Dump)

| Feature | Requirement IDs |
|---|---|
| Directory traversal + depth control | FR-1.1, FR-1.2, FR-1.3, FR-1.4 |
| `.gitignore` + `.contextdumpignore` + default exclusions | FR-2.1, FR-2.2, FR-2.3 |
| `--exclude` pattern flag | FR-2.4 |
| Extension filtering (`--include`, `--exclude-ext`) | FR-3.1, FR-3.2 |
| Binary file detection + skip | FR-3.3 |
| File size limit | FR-3.4 |
| Token counting + model limit warnings | FR-4.1, FR-4.2, FR-4.3 |
| Markdown output format | FR-5.1 |
| `--tree-only` mode | FR-5.3 |
| Relative paths in output | FR-5.4 |
| stdout (default), `--copy`, `--output` destinations | FR-6.1, FR-6.2, FR-6.3 |
| Terminal summary (stderr) | FR-8.1 |

### Phase 2 — Developer Experience Polish

| Feature | Requirement IDs |
|---|---|
| Config file (`contextdump.config.json`) | FR-7.1, FR-7.2 |
| `contextdump init` subcommand | FR-7.3 |
| `--format text` and `--format json` | FR-5.2 |
| `--verbose` per-file token breakdown | FR-4.5 |
| `--hard-limit` exit code | FR-4.4 |
| `--no-header` flag | FR-5.5 |
| `--ignore-file` flag | FR-2.5 |
| Stable alphabetical sort on output | FR-5.6 |
| `--copy` + `--output` combined | FR-6.4 |

### Phase 3 — Power Features

| Feature | Notes |
|---|---|
| Interactive TUI mode | Terminal checkbox UI to toggle individual files before dumping — powered by `@inquirer/checkbox` or `ink` |
| Git-aware mode | `--git-diff` flag: only include files changed since last commit or between two refs |
| VS Code extension | Adds "ContextDump selection" right-click command in the file explorer |
| Web UI | Local browser UI at `localhost:3333` for visual file picking before dump |
| Direct API send | `--send claude` pipes the dump directly to the Anthropic API and streams the response to terminal |
| Smart chunking | `--chunk N` splits output into multiple files/clipboard entries under N tokens each |

---

## 9. Architecture Blueprint

### 9.1 Project Structure

```
contextdump/
├── bin/
│   └── contextdump.ts        # Entry point registered as CLI binary
├── src/
│   ├── cli.ts                # commander setup; wires flags → orchestrator
│   ├── orchestrator.ts       # Coordinates walker → ignorer → resolver → renderer → writer
│   ├── walker.ts             # Directory traversal using fast-glob; returns WalkedFile[]
│   ├── ignorer.ts            # Builds composite ignore ruleset from all sources
│   ├── resolver.ts           # Reads file contents; detects binary; applies size limit
│   ├── tokenizer.ts          # Token estimation using tiktoken cl100k_base
│   ├── renderer/
│   │   ├── index.ts          # Dispatch to correct renderer by format
│   │   ├── markdownRenderer.ts
│   │   ├── textRenderer.ts
│   │   └── jsonRenderer.ts
│   ├── writer.ts             # Writes output to stdout / clipboard / file
│   ├── treeBuilder.ts        # Builds printable ASCII directory tree string
│   ├── configLoader.ts       # Reads + merges contextdump.config.json with CLI flags
│   └── constants/
│       ├── fenceMap.ts       # Extension → markdown fence language mapping
│       ├── modelLimits.ts    # Model name → context window size mapping
│       └── defaultIgnores.ts # Hardcoded default exclusion patterns
├── shared/
│   └── types.ts              # All shared TypeScript interfaces
├── tests/
│   ├── walker.test.ts
│   ├── ignorer.test.ts
│   ├── tokenizer.test.ts
│   └── renderer.test.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 9.2 Internal Data Flow

```
bin/contextdump.ts
       │
       ▼
  cli.ts (commander)
       │ parsed flags + target dir
       ▼
  configLoader.ts
       │ merged ContextDumpConfig
       ▼
  orchestrator.ts
       │
       ├─ 1. ignorer.ts
       │        reads .gitignore + .contextdumpignore + defaults + CLI excludes
       │        returns: Ignore instance
       │
       ├─ 2. walker.ts
       │        fast-glob traversal, applies Ignore instance + depth limit
       │        returns: WalkedFile[]
       │
       ├─ 3. resolver.ts
       │        reads content of each non-ignored, non-binary file
       │        applies max-file-size check
       │        returns: ResolvedFile[]
       │
       ├─ 4. treeBuilder.ts
       │        builds ASCII tree string from WalkedFile[]
       │        returns: string
       │
       ├─ 5. tokenizer.ts
       │        estimates tokens for full output
       │        checks against model limit
       │        returns: { total, perFile, withinLimit }
       │
       ├─ 6. renderer/index.ts
       │        selects correct renderer by config.format
       │        assembles final DumpResult
       │        returns: string (renderedOutput)
       │
       └─ 7. writer.ts
                writes to stdout / clipboard / file per config
                prints DumpMeta summary to stderr
```

### 9.3 Module Reference

```typescript
// src/walker.ts
import fg from 'fast-glob';
import type { Ignore } from 'ignore';
import type { ContextDumpConfig, WalkedFile } from '../shared/types.js';

export async function walkDirectory(
  targetDir: string,
  ignoreInstance: Ignore,
  config: ContextDumpConfig
): Promise<WalkedFile[]> {
  const patterns = ['**/*'];
  const entries = await fg(patterns, {
    cwd: targetDir,
    dot: true,
    followSymbolicLinks: config.followSymlinks ?? false,
    deep: config.depth ?? Infinity,
    onlyFiles: true,
  });

  return entries
    .filter(rel => !ignoreInstance.ignores(rel))
    .filter(rel => matchesExtensionFilter(rel, config))
    .map(rel => buildWalkedFile(rel, targetDir));
}
```

```typescript
// src/constants/modelLimits.ts
import type { ModelKey } from '../../shared/types.js';

export const MODEL_LIMITS: Record<ModelKey, number> = {
  'claude':           200_000,
  'claude-sonnet':    200_000,
  'gpt-4o':          128_000,
  'gpt-4-turbo':     128_000,
  'gpt-3.5':          16_385,
  'gemini-1.5-pro': 1_048_576,
  'gemini-2.0-flash':1_048_576,
  'llama3':            8_192,
};
```

```typescript
// src/tokenizer.ts
import { get_encoding } from 'tiktoken';
import type { ResolvedFile } from '../shared/types.js';

const enc = get_encoding('cl100k_base');

export function estimateTokens(text: string): number {
  return enc.encode(text).length;
}

export function estimatePerFile(
  files: ResolvedFile[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const file of files) {
    map.set(file.path, estimateTokens(file.content));
  }
  return map;
}
```

### 9.4 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "bin/**/*", "shared/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 10. Glossary

| Term | Definition |
|---|---|
| Dump | The complete structured output (tree + file contents) produced for a target directory |
| Walker | The module responsible for recursively listing files in the target directory |
| Ignorer | The module that builds and applies the combined ignore ruleset |
| Resolver | The module that reads file contents and applies binary/size checks |
| Renderer | The module that formats the resolved files into the chosen output format |
| Writer | The module that sends rendered output to its destination(s) |
| Token | The unit of text measurement used by LLMs — roughly 4 characters or ¾ of a word |
| Context window | The maximum number of tokens a given LLM can receive in a single request |
| Fence language | The syntax hint added after the opening triple-backtick in a markdown code block |
| `.contextdumpignore` | Project-specific ignore file using `.gitignore` syntax, committed to the repo |
| cl100k_base | The tokenizer encoding used by GPT-4 and Claude — the basis for ContextDump's estimates |
| Binary file | A file containing non-text byte sequences; detected by null-byte scan; contents skipped |
| Tree-only mode | Output mode that includes only the ASCII file tree, no file contents |
| Hard limit | Mode where exceeding the model's token limit causes a non-zero exit code |

---

*End of Document — ContextDump SRS v1.0.0*
