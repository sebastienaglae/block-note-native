import type { ReactNode } from "react";
import type {
  Block,
  CustomInlineContent,
  Editor,
  InlineContent,
  Styles,
} from "@sebastienaglae/bnn-core";
import type { Theme } from "./theme/theme";

export interface EditableSelection {
  start: number;
  end: number;
}

/** Text-style subset applied to a block's editable region (cross-platform). */
export interface BlockTextStyle {
  fontSize?: number;
  fontWeight?: "400" | "500" | "600" | "700";
  lineHeight?: number;
  color?: string;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
}

/** The platform-agnostic contract every editable surface implements. */
export interface RichTextInputProps {
  blockId: string;
  content: InlineContent[];
  /** Whether this block currently owns the editor selection (should focus). */
  active: boolean;
  /** Desired caret/selection when active. */
  selection: EditableSelection | null;
  placeholder?: string;
  editable?: boolean;
  textStyle?: BlockTextStyle;
  theme: Theme;
  /** Renders a custom inline node (pre-bound to editor + theme by the caller). */
  renderCustomInline?: (ic: CustomInlineContent) => ReactNode;

  onChange(content: InlineContent[], selection: EditableSelection): void;
  onSelectionChange(selection: EditableSelection): void;
  onFocus?(): void;
  onBlur?(): void;
  /** Enter (without Shift). `offset` is the caret position. */
  onEnter?(offset: number): void;
  /** Backspace with an empty selection at offset 0. */
  onBackspaceAtStart?(): void;
  /** Tab / Shift+Tab. */
  onTab?(shift: boolean): void;
  /** Caret tried to leave the top/bottom edge with an arrow key. */
  onArrowOut?(direction: "up" | "down", offset: number): void;
}

/** Props passed to a block renderer (default or custom). */
export interface BlockRenderProps<B extends Block = Block> {
  block: B;
  editor: Editor;
  theme: Theme;
  /** True if the editor selection is inside this block. */
  isSelected: boolean;
  /** 1-based ordinal for numbered list items (else undefined). */
  listIndex?: number;
  /** Navigate to another page (used by pageLink blocks); wired by the host app. */
  onOpenPage?: (pageId: string) => void;
  /** Translate function (key, fallback) for strings inside renderers. */
  t: (key: string, fallback: string) => string;
  /**
   * Renders the block's editable text region. Custom blocks call this where
   * they want editable content (the BlockNote `contentRef` equivalent).
   */
  InlineContentView: (props?: { textStyle?: BlockTextStyle; placeholder?: string }) => ReactNode;
}

export type BlockRenderer = (props: BlockRenderProps) => ReactNode;

/** Props passed to a custom inline content renderer. */
export interface InlineRenderProps<
  IC extends CustomInlineContent = CustomInlineContent,
> {
  inlineContent: IC;
  editor: Editor;
  theme: Theme;
}

export type InlineRenderer = (props: InlineRenderProps) => ReactNode;
export type InlineRendererMap = Record<string, InlineRenderer>;

/** A slash-menu command. */
export interface SlashMenuItem {
  key: string;
  title: string;
  subtitle?: string;
  /** i18n keys (optional); fall back to title/subtitle. */
  titleKey?: string;
  subtitleKey?: string;
  /** A named lucide icon (preferred for default items). */
  icon?: string;
  /** An emoji shown instead of an icon (for custom items). */
  emoji?: string;
  aliases?: string[];
  group?: string;
  /** Special behaviors handled by the editor view (e.g. opening the emoji picker). */
  kind?: "emoji";
  /** Runs when the item is chosen. The triggering "/query" has already been removed. */
  execute(editor: Editor, blockId: string): void;
}

export interface ActiveStylesQuery {
  styles: Styles;
}
