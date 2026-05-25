import type { ResolvedFile } from '../shared/types.js';

interface TreeNode {
  name: string;
  isDir: boolean;
  children: Map<string, TreeNode>;
  fileRef?: ResolvedFile;
}

export function buildTreeString(
  files: ResolvedFile[],
  projectName: string
): string {
  // Filter out files that are ignored.
  // We only show included files, binary files, and too-large files in the tree.
  const activeFiles = files.filter(f => f.skippedReason !== 'ignored');

  const root: TreeNode = {
    name: projectName,
    isDir: true,
    children: new Map(),
  };

  // Build the tree nodes
  for (const file of activeFiles) {
    const parts = file.path.split(/[/\\]/);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          isDir: !isLast,
          children: new Map(),
          fileRef: isLast ? file : undefined,
        });
      }
      current = current.children.get(part)!;
    }
  }

  // Helper to render tree to ASCII
  const lines: string[] = [projectName + '/'];
  
  function renderNode(node: TreeNode, prefix: string) {
    // Sort children: directories first, then files, both alphabetically
    const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      const isLast = i === sortedChildren.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      
      let line = prefix + connector + child.name;

      // Add skipped annotations if applicable
      if (child.fileRef?.skippedReason) {
        if (child.fileRef.skippedReason === 'binary') {
          line += ' [binary file — skipped]';
        } else if (child.fileRef.skippedReason === 'too-large') {
          line += ' [too large — skipped]';
        }
      }

      lines.push(line);

      if (child.isDir) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        renderNode(child, newPrefix);
      }
    }
  }

  renderNode(root, '');
  return lines.join('\n');
}
