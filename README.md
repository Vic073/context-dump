# ContextDump 📂➡️🤖

**ContextDump** is a developer CLI tool that traverses a directory, respects ignore files (`.gitignore`, `.contextdumpignore`), estimates LLM token usage using the `cl100k_base` (GPT-4/Claude) tokenizer, and packages the entire codebase context into a structured markdown, plaintext, or JSON format. You can copy it straight to your clipboard with a single flag.

No more tedious manual copy-pasting of source files when prompting Claude, ChatGPT, or Gemini.

---

## Features

- ⚡ **High Performance**: Recursively scans and traverses directories quickly (built using `fast-glob`).
- 🛑 **Respects Ignores**: Integrates parent and root-level `.gitignore` rules, custom `.contextdumpignore` files, and global CLI patterns.
- 🧮 **Token Limit Awareness**: Estimates tokens and warns you (or fails via `--hard-limit`) if your context exceeds selected model windows (Claude, GPT-4o, Gemini, etc.).
- 📋 **Seamless Clipboard & File Writing**: Writes dumps directly to system clipboard or files, with graceful stderr summaries keeping your piping tools clean.
- 🌲 **Tree-Only Mode**: Outputs just the directory visual structure without reading contents.
- ⚙️ **Configurable**: Define project-wide defaults in a `contextdump.config.json` file.

---

## Installation

Install globally using `npm`:

```bash
npm install -g contextdump
```

Or run directly without installation:

```bash
npx contextdump [directory] [options]
```

---

## Quick Start

1. Initialize ContextDump configuration in your project root:
   ```bash
   contextdump init
   ```
   *This creates a starter `contextdump.config.json` file and a `.contextdumpignore` in your working directory.*

2. Pack your directory and copy it to the clipboard:
   ```bash
   contextdump ./src --copy --model claude
   ```

3. Open your AI assistant (e.g. Claude) and paste (**Ctrl+V** or **Cmd+V**) the context directly!

---

## CLI Options Reference

```text
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

---

## Project Configuration

You can commit a `contextdump.config.json` to your project to enforce common rules:

```json
{
  "model": "claude",
  "include": ["ts", "tsx", "json", "md"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"],
  "depth": 5,
  "maxFileSizeKb": 500,
  "treeOnly": false,
  "copy": true,
  "format": "markdown"
}
```

---

## Developer Section

If you are developing or extending ContextDump locally:

### Prerequisites
- Node.js v18+

### Setup
```bash
# Install dependencies
npm install

# Run unit tests
npm run test

# Compile TypeScript
npm run build

# Link binary locally for global testing
npm link
```

## License

ISC License. Free to use and distribute.
