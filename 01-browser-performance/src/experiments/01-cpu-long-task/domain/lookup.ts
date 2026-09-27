import type { LookupNode } from "./types";

export function findLookupNodeById(
  nodes: LookupNode[],
  id: string,
): LookupNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const result = findLookupNodeById(node.children, id);
      if (result) return result;
    }
  }
  return undefined;
}

export function buildLookupIndex(nodes: LookupNode[]): Map<string, string> {
  const index = new Map<string, string>();

  const visit = (currentNodes: LookupNode[]) => {
    for (const node of currentNodes) {
      index.set(node.id, node.name);
      if (node.children) visit(node.children);
    }
  };

  visit(nodes);
  return index;
}

export function resolveLookupLabel(nodes: LookupNode[], id: string) {
  return findLookupNodeById(nodes, id)?.name ?? "Not specified";
}

export function resolveLookupLabelFromIndex(
  index: Map<string, string>,
  id: string,
) {
  return index.get(id) ?? "Not specified";
}
