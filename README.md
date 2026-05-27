ContextDump 📂➡️🤖

ContextDump is a developer CLI tool that traverses a directory, respects ignore files (.gitignore, .contextdumpignore), estimates LLM token usage using the cl100k_base tokenizer, and packages your entire codebase into structured markdown, plaintext, or JSON output.

It removes the pain of manually copy-pasting files when working with AI tools like Claude, ChatGPT, or Gemini.


---

Features

⚡ Fast Directory Traversal
Recursively scans projects efficiently using fast-glob.

🛑 Smart Ignore Handling
Respects .gitignore, .contextdumpignore, and additional custom ignore patterns.

🧮 Token Estimation
Estimates token usage and warns when your context approaches model limits.

📋 Clipboard & File Output
Copy dumps directly to your clipboard or save them to files.

🌲 Tree-Only Mode
Generate a clean directory structure without file contents.

⚙️ Project Configuration Support
Store reusable defaults in contextdump.config.json.



---

Usage

Run directly with npx:

npx contextdump [directory] [options]

Or clone the repository and use it locally.


---

Quick Start

1. Initialize configuration files:

contextdump init


2. Generate a context dump:

contextdump ./src --copy --model claude


3. Paste the generated context into your preferred AI assistant.




---

CLI Options Reference

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
      --no-defaults          Disable built-in ignore patterns
      --ignore-file <path>   Path to an additional ignore file
      --follow-symlinks      Follow symbolic links during traversal
      --hard-limit           Exit non-zero if token count exceeds model limit
  -v, --verbose              Show per-file token breakdown
  -h, --help                 Display help message
      --version              Display version number

Subcommands:
  contextdump init           Create starter config and ignore files


---

Project Configuration

Example contextdump.config.json:

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


---

Local Development

Requirements

Node.js v18+


Setup

# Install dependencies
npm install

# Run tests
npm run test

# Build project
npm run build

# Link locally for testing
npm link


---

License

ISC License — free to use and distribute.
