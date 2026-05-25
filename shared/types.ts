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
