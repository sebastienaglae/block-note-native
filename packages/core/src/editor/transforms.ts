/**
 * Block-level transforms used by keyboard handlers. All are pure: they take the
 * document and return a new document (+ resulting selection).
 */
import { defaultPropsForType, type BlockSchema } from "../schema/blockSchema";
import { createId } from "../util/id";
import { inlineLength, normalizeInline, sliceInline } from "../util/inline";
import type { Block, EditorSelection } from "../model/types";
import {
  flattenBlocks,
  insertRelative,
  locateBlock,
  removeBlock,
  replaceBlock,
} from "../model/tree";

export interface TransformResult {
  document: Block[];
  selection: EditorSelection;
}

const LIST_TYPES = new Set(["bulletListItem", "numberedListItem", "checkListItem"]);

/** Splits `blockId` at char `offset` (Enter). The continuation block takes the children. */
export function splitBlock(
  document: Block[],
  schema: BlockSchema,
  blockId: string,
  offset: number,
): TransformResult {
  const loc = locateBlock(document, blockId);
  if (!loc || loc.block.content === undefined) return { document, selection: null };
  const block = loc.block;
  const content = block.content ?? [];
  const before = sliceInline(content, 0, offset);
  const after = sliceInline(content, offset, inlineLength(content));

  // A heading continues as a paragraph; everything else keeps its own type.
  const continuationType = block.type === "heading" ? "paragraph" : block.type;
  const continuationProps =
    continuationType === block.type
      ? { ...block.props }
      : { ...defaultPropsForType(schema, continuationType) };
  if (continuationType === "checkListItem") continuationProps.checked = false;

  const continuation: Block = {
    id: createId(),
    type: continuationType,
    props: continuationProps,
    content: after,
    children: block.children,
  };
  const original: Block = { ...block, content: before, children: [] };

  const newDoc = replaceBlock(document, blockId, () => [original, continuation]);
  return { document: newDoc, selection: { blockId: continuation.id, start: 0, end: 0 } };
}

/** Merges `blockId` into the previous block in document order (Backspace at start). */
export function mergeWithPrevious(document: Block[], blockId: string): TransformResult | null {
  const flat = flattenBlocks(document);
  const idx = flat.findIndex((f) => f.block.id === blockId);
  if (idx <= 0) return null;
  const cur = flat[idx].block;
  const prev = flat[idx - 1].block;
  if (prev.content === undefined) return null; // can't merge into a void block

  const prevLen = inlineLength(prev.content);

  const { tree } = removeBlock(document, cur.id);
  const freshPrev = locateBlock(tree, prev.id)?.block;
  if (!freshPrev) return null;

  const mergedContent = normalizeInline([...(freshPrev.content ?? []), ...(cur.content ?? [])]);
  const mergedChildren = [...freshPrev.children, ...cur.children];

  const newDoc = replaceBlock(tree, prev.id, () => ({
    ...freshPrev,
    content: mergedContent,
    children: mergedChildren,
  }));
  return { document: newDoc, selection: { blockId: prev.id, start: prevLen, end: prevLen } };
}

/** Converts a block to another type, preserving content. Used to "exit" lists, etc. */
export function changeBlockType(
  document: Block[],
  schema: BlockSchema,
  blockId: string,
  type: string,
  extraProps: Record<string, unknown> = {},
): Block[] {
  return replaceBlock(document, blockId, (b) => ({
    ...b,
    type,
    props: { ...defaultPropsForType(schema, type), ...extraProps },
  }));
}

/** Tab: make the block a child of its previous sibling. No-op if it's the first sibling. */
export function indentBlock(document: Block[], blockId: string): Block[] {
  const loc = locateBlock(document, blockId);
  if (!loc || loc.index === 0) return document;
  const prevSibling = loc.siblings[loc.index - 1];
  const { tree, removed } = removeBlock(document, blockId);
  if (!removed) return document;
  return insertRelative(tree, prevSibling.id, [removed], "nested");
}

/** Shift-Tab: move the block out to become a sibling after its parent. No-op at root. */
export function outdentBlock(document: Block[], blockId: string): Block[] {
  const loc = locateBlock(document, blockId);
  if (!loc || !loc.parent) return document;
  const parentId = loc.parent.id;
  const { tree, removed } = removeBlock(document, blockId);
  if (!removed) return document;
  return insertRelative(tree, parentId, [removed], "after");
}

export function isListType(type: string): boolean {
  return LIST_TYPES.has(type);
}
