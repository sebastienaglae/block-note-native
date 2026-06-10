/**
 * Core document model.
 *
 * A document is a tree of {@link Block}s. Text-bearing blocks hold an array of
 * {@link InlineContent} (styled text, links, and custom inline content). Void
 * blocks (divider, image) have `content: undefined`.
 *
 * This module is intentionally free of any platform/UI concerns so it can run
 * unchanged on web (React DOM) and React Native.
 */

/** Inline text marks. Booleans are toggles; colors are string tokens (e.g. "red", "#ff0000", or "default"). */
export interface Styles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

/** A run of text sharing the same {@link Styles}. */
export interface StyledText {
  type: "text";
  text: string;
  styles: Styles;
}

/** A hyperlink wrapping one or more styled text runs. */
export interface Link {
  type: "link";
  href: string;
  content: StyledText[];
}

/**
 * Custom inline content (e.g. a "@mention"). It is treated as an atomic unit by
 * the editor (the cursor steps over it as one character-equivalent token).
 * `type` is any string other than "text"/"link".
 */
export interface CustomInlineContent<
  Type extends string = string,
  Props extends Record<string, unknown> = Record<string, unknown>,
> {
  type: Type;
  props: Props;
  /** Optional visible text used for serialization / cursor accounting. */
  content?: StyledText[];
}

export type InlineContent = StyledText | Link | CustomInlineContent;

/** A looser shape accepted by builder APIs; normalized into {@link InlineContent}[]. */
export type PartialInlineContent =
  | string
  | InlineContent
  | Array<string | InlineContent>;

/** A single node in the document tree. */
export interface Block<
  Type extends string = string,
  Props extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  type: Type;
  props: Props;
  /** Inline content for text blocks; `undefined` for void blocks. */
  content: InlineContent[] | undefined;
  children: Block[];
}

/** Partial block used when inserting/updating; missing fields are filled from the schema. */
export interface PartialBlock {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: PartialInlineContent;
  children?: PartialBlock[];
}

/** The whole document. */
export type BlockDocument = Block[];

/**
 * Editor selection. The MVP supports a text selection within a single block
 * (covers caret position + range formatting). `start`/`end` are character
 * offsets into the block's flattened inline text.
 */
export interface TextSelection {
  blockId: string;
  start: number;
  end: number;
}

export type EditorSelection = TextSelection | null;

/** Page-level metadata that lives alongside the block tree (icon, cover, title). */
export interface PageMeta {
  /** Emoji or short icon string. */
  icon?: string;
  /** Cover image URL. */
  cover?: string;
  /** Title rich text (rendered as a fixed, non-movable H1). */
  title: InlineContent[];
}

/** A comment thread anchored to a block. */
export interface Comment {
  id: string;
  author: string;
  text: string;
  /** Epoch ms; supplied by the caller so the model stays deterministic. */
  createdAt: number;
  resolved?: boolean;
}

/** The synthetic block id used by the page title's editable surface. */
export const TITLE_BLOCK_ID = "__title__";
