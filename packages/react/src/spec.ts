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
import type { BlockConfig, InlineContentConfig } from "@sebastienaglae/bnn-core";
import type { BlockRenderer, InlineRenderer, SlashMenuItem } from "./types";
import { defaultSlashItems } from "./ui/defaultSlashItems";

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
}

export interface ReactBlockSpec {
  config: BlockConfig;
  renderer: BlockRenderer;
  slashItem?: SlashMenuItem;
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
  return { config, renderer: options.render, slashItem };
}

export interface ReactInlineContentSpec {
  config: InlineContentConfig;
  renderer: InlineRenderer;
}

export function createReactInlineContentSpec(
  config: InlineContentConfig,
  options: { render: InlineRenderer },
): ReactInlineContentSpec {
  return { config, renderer: options.render };
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

  return { blockSpecs, inlineSpecs, blockRenderers, inlineRenderers, slashItems };
}
