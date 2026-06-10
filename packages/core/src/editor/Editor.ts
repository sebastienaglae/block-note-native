/**
 * The framework-agnostic editor. Holds the document + selection, exposes a
 * mutation API (mirroring BlockNote's where practical), and notifies subscribers
 * so UI layers can re-render via `useSyncExternalStore`.
 */
import {
  createBlockSchema,
  defaultPropsForType,
  type BlockConfig,
  type BlockSchema,
} from "../schema/blockSchema";
import { createInlineSchema, type InlineContentConfig, type InlineSchema } from "../schema/inlineSchema";
import { normalizeBlock, normalizeDocument } from "../model/normalize";
import { getBlock, locateBlock, flattenBlocks, insertRelative, removeBlock, replaceBlock } from "../model/tree";
import { History, type Snapshot } from "./history";
import {
  changeBlockType,
  indentBlock,
  mergeWithPrevious,
  outdentBlock,
  splitBlock,
} from "./transforms";
import {
  applyStylesToRange,
  icText,
  inlineLength,
  isStyledText,
  partialToInline,
  spliceInline,
  stylesAt,
  type StyleMode,
} from "../util/inline";
import type {
  Block,
  Comment,
  EditorSelection,
  InlineContent,
  PageMeta,
  PartialBlock,
  PartialInlineContent,
  Styles,
  TextSelection,
} from "../model/types";

export interface EditorOptions {
  initialContent?: PartialBlock[];
  initialMeta?: { icon?: string; cover?: string; title?: PartialInlineContent };
  initialComments?: Record<string, Comment[]>;
  locked?: boolean;
  blockSpecs?: BlockConfig[];
  inlineSpecs?: InlineContentConfig[];
}

type Listener = () => void;

export class Editor {
  readonly schema: BlockSchema;
  readonly inlineSchema: InlineSchema;

  private _document: Block[];
  private _selection: EditorSelection = null;
  private _meta: PageMeta;
  private _comments: Record<string, Comment[]>;
  private _locked: boolean;
  private readonly history = new History();
  private readonly listeners = new Set<Listener>();
  private version = 0;

  constructor(options: EditorOptions = {}) {
    this.schema = createBlockSchema(options.blockSpecs ?? []);
    this.inlineSchema = createInlineSchema(options.inlineSpecs ?? []);
    this._document = normalizeDocument(
      options.initialContent ?? [{ type: "paragraph" }],
      this.schema,
    );
    this._meta = {
      icon: options.initialMeta?.icon,
      cover: options.initialMeta?.cover,
      title: partialToInline(options.initialMeta?.title),
    };
    this._comments = options.initialComments ?? {};
    this._locked = options.locked ?? false;
  }

  // ---- state access -------------------------------------------------------

  get document(): Block[] {
    return this._document;
  }

  get selection(): EditorSelection {
    return this._selection;
  }

  /** For React's useSyncExternalStore: a value that changes on every mutation. */
  getSnapshot = (): number => this.version;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    this.version++;
    for (const l of this.listeners) l();
  }

  private snapshot(): Snapshot {
    return {
      document: this._document,
      selection: this._selection,
      meta: this._meta,
      comments: this._comments,
    };
  }

  /** Runs a mutation with undo support. `fn` returns the changed parts of the state. */
  private transact(
    fn: () => Partial<{
      document: Block[];
      selection: EditorSelection;
      meta: PageMeta;
      comments: Record<string, Comment[]>;
    }> | null,
  ): void {
    const before = this.snapshot();
    const result = fn();
    if (!result) return;
    this.history.record(before);
    this.applyResult(result);
  }

  private applyResult(result: Partial<{
    document: Block[];
    selection: EditorSelection;
    meta: PageMeta;
    comments: Record<string, Comment[]>;
  }>): void {
    if (result.document !== undefined) this._document = ensureNonEmpty(result.document, this.schema);
    if (result.selection !== undefined) this._selection = result.selection;
    if (result.meta !== undefined) this._meta = result.meta;
    if (result.comments !== undefined) this._comments = result.comments;
    this.emit();
  }

  // ---- selection ----------------------------------------------------------

  setSelection(selection: EditorSelection): void {
    this._selection = selection;
    this.emit();
  }

  /** Selection without firing a re-render (used to track caret during typing). */
  setSelectionSilently(selection: EditorSelection): void {
    this._selection = selection;
  }

  getSelectedBlock(): Block | null {
    return this._selection ? getBlock(this._document, this._selection.blockId) : null;
  }

  // ---- block queries ------------------------------------------------------

  getBlock(id: string): Block | null {
    return getBlock(this._document, id);
  }

  getPrevBlock(id: string): Block | null {
    const flat = flattenBlocks(this._document);
    const idx = flat.findIndex((f) => f.block.id === id);
    return idx > 0 ? flat[idx - 1].block : null;
  }

  getNextBlock(id: string): Block | null {
    const flat = flattenBlocks(this._document);
    const idx = flat.findIndex((f) => f.block.id === id);
    return idx >= 0 && idx < flat.length - 1 ? flat[idx + 1].block : null;
  }

  // ---- block mutations (BlockNote-style API) ------------------------------

  insertBlocks(
    blocks: PartialBlock[],
    referenceBlockId: string,
    placement: "before" | "after" | "nested" = "after",
  ): Block[] {
    const normalized = blocks.map((b) => normalizeBlock(b, this.schema));
    this.transact(() => ({
      document: insertRelative(this._document, referenceBlockId, normalized, placement),
    }));
    return normalized;
  }

  updateBlock(
    blockId: string,
    update: { type?: string; props?: Record<string, unknown>; content?: PartialInlineContent },
  ): void {
    this.transact(() => {
      const loc = locateBlock(this._document, blockId);
      if (!loc) return null;
      const nextType = update.type ?? loc.block.type;
      const spec = this.schema[nextType];
      const baseProps =
        update.type && update.type !== loc.block.type
          ? defaultPropsForType(this.schema, nextType)
          : loc.block.props;
      const props = { ...baseProps, ...(update.props ?? {}) };
      let content = loc.block.content;
      if (update.content !== undefined) content = partialToInline(update.content);
      if (spec && spec.content === "none") content = undefined;
      else if (content === undefined && spec && spec.content === "inline") content = [];
      const document = replaceBlock(this._document, blockId, (b) => ({
        ...b,
        type: nextType,
        props,
        content,
      }));
      return { document };
    });
  }

  /** Fast path for the rich-text input: replace a block's inline content only. */
  setBlockContent(blockId: string, content: InlineContent[], selection?: TextSelection): void {
    this.transact(() => {
      const document = replaceBlock(this._document, blockId, (b) => ({ ...b, content }));
      return { document, selection: selection ?? this._selection };
    });
  }

  removeBlocks(blockIds: string[]): void {
    this.transact(() => {
      let document = this._document;
      for (const id of blockIds) document = removeBlock(document, id).tree;
      return { document, selection: null };
    });
  }

  replaceBlocks(blockIds: string[], blocks: PartialBlock[]): Block[] {
    const normalized = blocks.map((b) => normalizeBlock(b, this.schema));
    this.transact(() => {
      if (blockIds.length === 0) return null;
      const [first, ...rest] = blockIds;
      let document = replaceBlock(this._document, first, () => normalized);
      for (const id of rest) document = removeBlock(document, id).tree;
      return { document };
    });
    return normalized;
  }

  // ---- structural moves ---------------------------------------------------

  nestBlock(blockId: string): void {
    this.transact(() => ({ document: indentBlock(this._document, blockId) }));
  }

  unnestBlock(blockId: string): void {
    this.transact(() => ({ document: outdentBlock(this._document, blockId) }));
  }

  moveBlockUp(blockId: string): void {
    this.transact(() => {
      const loc = locateBlock(this._document, blockId);
      if (!loc || loc.index === 0) return null;
      const prev = loc.siblings[loc.index - 1];
      const { tree, removed } = removeBlock(this._document, blockId);
      if (!removed) return null;
      return { document: insertRelative(tree, prev.id, [removed], "before") };
    });
  }

  moveBlockDown(blockId: string): void {
    this.transact(() => {
      const loc = locateBlock(this._document, blockId);
      if (!loc || loc.index >= loc.siblings.length - 1) return null;
      const next = loc.siblings[loc.index + 1];
      const { tree, removed } = removeBlock(this._document, blockId);
      if (!removed) return null;
      return { document: insertRelative(tree, next.id, [removed], "after") };
    });
  }

  /** Moves `blockId` to be before/after/nested under `targetId` (drag & drop). */
  moveBlock(
    blockId: string,
    targetId: string,
    placement: "before" | "after" | "nested",
  ): void {
    if (blockId === targetId) return;
    // Guard against dropping a block into its own subtree.
    if (locateBlock(getBlock(this._document, blockId)?.children ?? [], targetId)) return;
    this.transact(() => {
      const { tree, removed } = removeBlock(this._document, blockId);
      if (!removed) return null;
      return { document: insertRelative(tree, targetId, [removed], placement) };
    });
  }

  // ---- keyboard transforms ------------------------------------------------

  /** Enter. Special-cases empty list items (they exit the list instead of splitting). */
  splitAtSelection(): void {
    const sel = this._selection;
    if (!sel) return;
    const block = getBlock(this._document, sel.blockId);
    if (!block) return;
    const len = inlineLength(block.content);
    const isList = ["bulletListItem", "numberedListItem", "checkListItem"].includes(block.type);
    if (isList && len === 0) {
      this.transact(() => ({
        document: changeBlockType(this._document, this.schema, block.id, "paragraph"),
        selection: { blockId: block.id, start: 0, end: 0 },
      }));
      return;
    }
    this.transact(() => splitBlock(this._document, this.schema, sel.blockId, sel.start));
  }

  /** Backspace at offset 0. Returns true if it handled something. */
  mergeBackward(blockId: string): boolean {
    const block = getBlock(this._document, blockId);
    if (!block) return false;
    // Non-paragraph at start first becomes a paragraph (Notion behaviour).
    if (block.type !== "paragraph") {
      this.transact(() => ({
        document: changeBlockType(this._document, this.schema, blockId, "paragraph"),
        selection: { blockId, start: 0, end: 0 },
      }));
      return true;
    }
    const before = this.snapshot();
    const result = mergeWithPrevious(this._document, blockId);
    if (!result) return false;
    this.history.record(before);
    this.applyResult(result);
    return true;
  }

  // ---- inline styling -----------------------------------------------------

  private mutateSelectionContent(
    fn: (content: InlineContent[], sel: TextSelection) => InlineContent[],
    keepSelection = true,
  ): void {
    const sel = this._selection;
    if (!sel) return;
    this.transact(() => {
      const block = getBlock(this._document, sel.blockId);
      if (!block || block.content === undefined) return null;
      const content = fn(block.content, sel);
      const document = replaceBlock(this._document, sel.blockId, (b) => ({ ...b, content }));
      return { document, selection: keepSelection ? sel : this._selection };
    });
  }

  toggleStyles(styles: Styles): void {
    this.applyStyles(styles, "toggle");
  }

  addStyles(styles: Styles): void {
    this.applyStyles(styles, "add");
  }

  removeStyles(styles: Styles): void {
    this.applyStyles(styles, "remove");
  }

  applyStyles(styles: Styles, mode: StyleMode): void {
    this.mutateSelectionContent((content, sel) =>
      applyStylesToRange(content, sel.start, sel.end, styles, mode),
    );
  }

  /** Styles currently active (whole-selection AND, or caret-position marks). */
  getActiveStyles(): Styles {
    const sel = this._selection;
    if (!sel) return {};
    const block = getBlock(this._document, sel.blockId);
    if (!block || !block.content) return {};
    if (sel.start === sel.end) return stylesAt(block.content, sel.start);
    return commonStyles(block.content, sel.start, sel.end);
  }

  /** Wrap the current selection (or insert) as a link. */
  createLink(href: string, text?: string): void {
    const sel = this._selection;
    if (!sel) return;
    this.mutateSelectionContent((content, s) => {
      const label = text ?? (sliceText(content, s.start, s.end) || href);
      const link: InlineContent = {
        type: "link",
        href,
        content: [{ type: "text", text: label, styles: {} }],
      };
      return spliceInline(content, s.start, s.end, [link]);
    });
  }

  /** Inserts inline content (text or custom) at the caret. */
  insertInlineContent(content: PartialInlineContent): void {
    const sel = this._selection;
    if (!sel) return;
    const toInsert = partialToInline(content);
    const insertedLen = toInsert.reduce((n, ic) => n + icLen(ic), 0);
    this.mutateSelectionContent((c, s) => spliceInline(c, s.start, s.end, toInsert), false);
    const caret = sel.start + insertedLen;
    this.setSelection({ blockId: sel.blockId, start: caret, end: caret });
  }

  // ---- history ------------------------------------------------------------

  undo(): void {
    const result = this.history.undo(this.snapshot());
    if (result) this.restore(result);
  }

  redo(): void {
    const result = this.history.redo(this.snapshot());
    if (result) this.restore(result);
  }

  private restore(s: { document: Block[]; selection: EditorSelection; meta: PageMeta; comments: Record<string, Comment[]> }): void {
    this._document = s.document;
    this._selection = s.selection;
    this._meta = s.meta;
    this._comments = s.comments;
    this.emit();
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  // ---- page metadata (icon / cover / title) -------------------------------

  get meta(): PageMeta {
    return this._meta;
  }

  setPageTitle(content: PartialInlineContent, selection?: EditorSelection): void {
    this.transact(() => ({
      meta: { ...this._meta, title: partialToInline(content) },
      selection: selection ?? this._selection,
    }));
  }

  setPageIcon(icon: string | null): void {
    this.transact(() => ({ meta: { ...this._meta, icon: icon ?? undefined } }));
  }

  setPageCover(cover: string | null): void {
    this.transact(() => ({ meta: { ...this._meta, cover: cover ?? undefined } }));
  }

  // ---- comments -----------------------------------------------------------

  get comments(): Record<string, Comment[]> {
    return this._comments;
  }

  getComments(blockId: string): Comment[] {
    return this._comments[blockId] ?? [];
  }

  addComment(blockId: string, comment: Comment): void {
    this.transact(() => ({
      comments: { ...this._comments, [blockId]: [...(this._comments[blockId] ?? []), comment] },
    }));
  }

  updateComment(blockId: string, commentId: string, patch: Partial<Comment>): void {
    this.transact(() => {
      const list = this._comments[blockId];
      if (!list) return null;
      return {
        comments: {
          ...this._comments,
          [blockId]: list.map((c) => (c.id === commentId ? { ...c, ...patch } : c)),
        },
      };
    });
  }

  removeComment(blockId: string, commentId: string): void {
    this.transact(() => {
      const list = this._comments[blockId];
      if (!list) return null;
      const next = list.filter((c) => c.id !== commentId);
      const comments = { ...this._comments };
      if (next.length) comments[blockId] = next;
      else delete comments[blockId];
      return { comments };
    });
  }

  // ---- lock / read-only ---------------------------------------------------

  get locked(): boolean {
    return this._locked;
  }

  setLocked(locked: boolean): void {
    this._locked = locked;
    this.emit();
  }

  // ---- serialization ------------------------------------------------------

  /** Full page snapshot for persistence (meta + comments + blocks). */
  toJSON(): { meta: PageMeta; comments: Record<string, Comment[]>; blocks: Block[] } {
    return { meta: this._meta, comments: this._comments, blocks: this._document };
  }

  replaceDocument(partials: PartialBlock[], meta?: { icon?: string; cover?: string; title?: PartialInlineContent }, comments?: Record<string, Comment[]>): void {
    this.transact(() => ({
      document: normalizeDocument(partials, this.schema),
      meta: meta ? { icon: meta.icon, cover: meta.cover, title: partialToInline(meta.title) } : this._meta,
      comments: comments ?? this._comments,
      selection: null,
    }));
  }
}

// ---- local helpers --------------------------------------------------------

function ensureNonEmpty(document: Block[], schema: BlockSchema): Block[] {
  return document.length ? document : [normalizeBlock({ type: "paragraph" }, schema)];
}

function icLen(ic: InlineContent): number {
  return icText(ic).length || (isStyledText(ic) ? 0 : 1);
}

function sliceText(content: InlineContent[], start: number, end: number): string {
  let pos = 0;
  let out = "";
  for (const ic of content) {
    const len = icLen(ic);
    const icStart = pos;
    const icEnd = pos + len;
    pos = icEnd;
    if (icEnd <= start || icStart >= end) continue;
    if (isStyledText(ic)) {
      out += ic.text.slice(Math.max(0, start - icStart), Math.min(len, end - icStart));
    }
  }
  return out;
}

/** AND of styles across all text runs in the range (for toolbar active state). */
function commonStyles(content: InlineContent[], start: number, end: number): Styles {
  let pos = 0;
  const texts: Styles[] = [];
  for (const ic of content) {
    const len = icLen(ic);
    const icStart = pos;
    const icEnd = pos + len;
    pos = icEnd;
    if (icEnd <= start || icStart >= end) continue;
    if (isStyledText(ic)) texts.push(ic.styles);
  }
  if (!texts.length) return {};
  const out: Styles = {};
  const keys: (keyof Styles)[] = ["bold", "italic", "underline", "strike", "code"];
  for (const k of keys) {
    if (texts.every((s) => !!s[k])) (out as Record<string, unknown>)[k] = true;
  }
  // colors: only report if uniform
  for (const k of ["textColor", "backgroundColor"] as const) {
    const first = texts[0][k];
    if (first && texts.every((s) => s[k] === first)) out[k] = first;
  }
  return out;
}
