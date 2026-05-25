export const FENCE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.json': 'json',
  '.md': 'markdown',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.sh': 'bash',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.sql': 'sql',
  '.prisma': 'prisma',
  '.graphql': 'graphql',
};

export function getFenceLanguage(filepath: string): string {
  const filename = filepath.split('/').pop()?.split('\\').pop() || '';
  if (filename.startsWith('.env')) {
    return 'bash';
  }
  
  const extIndex = filename.lastIndexOf('.');
  if (extIndex === -1) {
    return '';
  }
  
  const ext = filename.substring(extIndex).toLowerCase();
  return FENCE_MAP[ext] || '';
}
