/** Pure operations over the block tree. All return new arrays (copy-on-write). */
import type { Block } from "./types";

export interface BlockLocation {
  block: Block;
  /** The sibling array containing the block. */
  siblings: Block[];
  index: number;
  /** Parent block, or null if the block is at the root. */
  parent: Block | null;
}

/** Depth-first search for a block by id, returning its location in the tree. */
export function locateBlock(
  blocks: Block[],
  id: string,
  parent: Block | null = null,
): BlockLocation | null {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.id === id) return { block, siblings: blocks, index: i, parent };
    if (block.children.length) {
      const found = locateBlock(block.children, id, block);
      if (found) return found;
    }
  }
  return null;
}

export function getBlock(blocks: Block[], id: string): Block | null {
  return locateBlock(blocks, id)?.block ?? null;
}

/** Flattens the tree into a pre-order list of `{ block, depth }`. */
export function flattenBlocks(blocks: Block[], depth = 0): Array<{ block: Block; depth: number }> {
  const out: Array<{ block: Block; depth: number }> = [];
  for (const block of blocks) {
    out.push({ block, depth });
    if (block.children.length) out.push(...flattenBlocks(block.children, depth + 1));
  }
  return out;
}

export type BlockReplacer = (block: Block) => Block | Block[] | null;

/** Replaces the block with `id` by applying `fn`. Returning null removes it; an array splices in. */
export function replaceBlock(blocks: Block[], id: string, fn: BlockReplacer): Block[] {
  const out: Block[] = [];
  let changed = false;
  for (const block of blocks) {
    if (block.id === id) {
      const result = fn(block);
      changed = true;
      if (result == null) continue;
      if (Array.isArray(result)) out.push(...result);
      else out.push(result);
      continue;
    }
    if (block.children.length) {
      const newChildren = replaceBlock(block.children, id, fn);
      if (newChildren !== block.children) {
        changed = true;
        out.push({ ...block, children: newChildren });
        continue;
      }
    }
    out.push(block);
  }
  return changed ? out : blocks;
}

/** Inserts `newBlocks` relative to the block `refId`. */
export function insertRelative(
  blocks: Block[],
  refId: string,
  newBlocks: Block[],
  placement: "before" | "after" | "nested",
): Block[] {
  const out: Block[] = [];
  let changed = false;
  for (const block of blocks) {
    if (block.id === refId) {
      changed = true;
      if (placement === "before") {
        out.push(...newBlocks, block);
      } else if (placement === "after") {
        out.push(block, ...newBlocks);
      } else {
        out.push({ ...block, children: [...block.children, ...newBlocks] });
      }
      continue;
    }
    if (block.children.length) {
      const newChildren = insertRelative(block.children, refId, newBlocks, placement);
      if (newChildren !== block.children) {
        changed = true;
        out.push({ ...block, children: newChildren });
        continue;
      }
    }
    out.push(block);
  }
  return changed ? out : blocks;
}

/** Removes a block, returning the new tree and the removed block (if found). */
export function removeBlock(
  blocks: Block[],
  id: string,
): { tree: Block[]; removed: Block | null } {
  let removed: Block | null = null;
  const tree = replaceBlock(blocks, id, (b) => {
    removed = b;
    return null;
  });
  return { tree, removed };
}
