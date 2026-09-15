export interface TreeNode<T> {
  node: T;
  depth: number;
}

/**
 * Flattens a parent-linked list into depth-first, indented order for a simple
 * tree-as-a-table rendering (root nodes first, each followed by its descendants).
 */
export function buildTree<T extends { id: string; parentId: string | null }>(items: T[]): TreeNode<T>[] {
  const byParent = new Map<string | null, T[]>();
  for (const item of items) {
    const siblings = byParent.get(item.parentId) ?? [];
    siblings.push(item);
    byParent.set(item.parentId, siblings);
  }

  const result: TreeNode<T>[] = [];
  function visit(parentId: string | null, depth: number) {
    for (const node of byParent.get(parentId) ?? []) {
      result.push({ node, depth });
      visit(node.id, depth + 1);
    }
  }

  visit(null, 0);
  return result;
}
