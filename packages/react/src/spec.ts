/**
 * Custom component API. Define a block or inline content type ONCE (with React
 * Native primitives) and it renders on web and native alike.
 *
 *   const Callout = createReactBlockSpec(
 *     { type: "callout", content: "inline", propSchema: { emoji: { default: "💡" } } },
 *     {
 *       render: ({ block, editor, theme, InlineContentView }) => (...),
 *       slashMenu: { title: "Callout", icon: "💡", group: "Custom" },
 *     },
 *   );
 *
 *   const { blockSpecs, inlineSpecs, blockRenderers, inlineRenderers, slashItems } =
 *     createBlockNoteSchema({ blockSpecs: [Callout], inlineSpecs: [Mention] });
 */
import type {
  Block,
  BlockConfig,
  CustomInlineContent,
  InlineContent,
  InlineContentConfig,
  MarkdownSerializers,
} from "@sebastienaglae/bnn-core";
import type { BlockRenderer, InlineRenderer, SlashMenuItem } from "./types";
import { defaultSlashItems } from "./ui/defaultSlashItems";

/** Serializes a custom block to markdown. `ctx.inline` renders the block's text. */
export type BlockMarkdownSerializer = (
  block: Block,
  ctx: { inline: (content: InlineContent[] | undefined) => string },
) => string | null | undefined;

/** Serializes a custom inline node (e.g. a mention) to markdown. */
export type InlineMarkdownSerializer = (ic: CustomInlineContent) => string | null | undefined;

export interface BlockSlashMenuConfig {
  title: string;
  subtitle?: string;
  icon?: string;
  group?: string;
  aliases?: string[];
  /** Props applied to the block when this item runs. */
  props?: Record<string, unknown>;
}

export interface CreateReactBlockSpecOptions {
  render: BlockRenderer;
  /** When provided, a slash-menu command is generated for this block. */
  slashMenu?: BlockSlashMenuConfig;
  /** Optional markdown exporter so this block survives `blocksToMarkdown`. */
  toMarkdown?: BlockMarkdownSerializer;
}

export interface ReactBlockSpec {
  config: BlockConfig;
  renderer: BlockRenderer;
  slashItem?: SlashMenuItem;
  toMarkdown?: BlockMarkdownSerializer;
}

export function createReactBlockSpec(
  config: BlockConfig,
  options: CreateReactBlockSpecOptions,
): ReactBlockSpec {
  let slashItem: SlashMenuItem | undefined;
  if (options.slashMenu) {
    const sm = options.slashMenu;
    slashItem = {
      key: config.type,
      title: sm.title,
      subtitle: sm.subtitle,
      // Custom blocks typically use an emoji; default blocks use a lucide icon name.
      emoji: sm.icon,
      group: sm.group ?? "Custom",
      aliases: sm.aliases,
      execute: (editor, blockId) => {
        editor.updateBlock(blockId, { type: config.type, props: sm.props });
        editor.setSelection({ blockId, start: 0, end: 0 });
      },
    };
  }
  return { config, renderer: options.render, slashItem, toMarkdown: options.toMarkdown };
}

export interface ReactInlineContentSpec {
  config: InlineContentConfig;
  renderer: InlineRenderer;
  toMarkdown?: InlineMarkdownSerializer;
}

export function createReactInlineContentSpec(
  config: InlineContentConfig,
  options: { render: InlineRenderer; toMarkdown?: InlineMarkdownSerializer },
): ReactInlineContentSpec {
  return { config, renderer: options.render, toMarkdown: options.toMarkdown };
}

export interface BlockNoteSchemaInput {
  blockSpecs?: ReactBlockSpec[];
  inlineSpecs?: ReactInlineContentSpec[];
  /** Extra slash items beyond block-generated and default ones. */
  extraSlashItems?: SlashMenuItem[];
  /** Set false to omit the built-in slash commands. */
  includeDefaultSlashItems?: boolean;
}

export interface BlockNoteSchema {
  /** For `new Editor({ blockSpecs, inlineSpecs })`. */
  blockSpecs: BlockConfig[];
  inlineSpecs: InlineContentConfig[];
  /** For `<BlockNoteView blockRenderers inlineRenderers slashItems />`. */
  blockRenderers: Record<string, BlockRenderer>;
  inlineRenderers: Record<string, InlineRenderer>;
  slashItems: SlashMenuItem[];
  /** Pass to `blocksToMarkdown(doc, schema.markdownSerializers)` for custom export. */
  markdownSerializers: MarkdownSerializers;
}

export function createBlockNoteSchema(input: BlockNoteSchemaInput = {}): BlockNoteSchema {
  const blockSpecs = (input.blockSpecs ?? []).map((s) => s.config);
  const inlineSpecs = (input.inlineSpecs ?? []).map((s) => s.config);

  const blockRenderers: Record<string, BlockRenderer> = {};
  for (const s of input.blockSpecs ?? []) blockRenderers[s.config.type] = s.renderer;

  const inlineRenderers: Record<string, InlineRenderer> = {};
  for (const s of input.inlineSpecs ?? []) inlineRenderers[s.config.type] = s.renderer;

  const slashItems: SlashMenuItem[] = [
    ...(input.includeDefaultSlashItems === false ? [] : defaultSlashItems),
    ...(input.blockSpecs ?? []).flatMap((s) => (s.slashItem ? [s.slashItem] : [])),
    ...(input.extraSlashItems ?? []),
  ];

  const markdownSerializers: MarkdownSerializers = { blocks: {}, inline: {} };
  for (const s of input.blockSpecs ?? []) {
    if (s.toMarkdown) markdownSerializers.blocks![s.config.type] = s.toMarkdown;
  }
  for (const s of input.inlineSpecs ?? []) {
    if (s.toMarkdown) markdownSerializers.inline![s.config.type] = s.toMarkdown;
  }

  return { blockSpecs, inlineSpecs, blockRenderers, inlineRenderers, slashItems, markdownSerializers };
}
