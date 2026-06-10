import { defaultPropsForType, type BlockSchema } from "../schema/blockSchema";
import { partialToInline } from "../util/inline";
import { createId } from "../util/id";
import type { Block, PartialBlock } from "./types";

/** Fills a {@link PartialBlock} into a complete {@link Block} using the schema defaults. */
export function normalizeBlock(partial: PartialBlock, schema: BlockSchema): Block {
  const type = partial.type ?? "paragraph";
  const spec = schema[type] ?? schema.paragraph;
  const props = { ...defaultPropsForType(schema, spec?.type ?? "paragraph"), ...(partial.props ?? {}) };
  const content = spec && spec.content === "none" ? undefined : partialToInline(partial.content);
  const children = (partial.children ?? []).map((c) => normalizeBlock(c, schema));
  return {
    id: partial.id ?? createId(),
    type: spec?.type ?? "paragraph",
    props,
    content,
    children,
  };
}

export function normalizeDocument(partials: PartialBlock[], schema: BlockSchema): Block[] {
  const blocks = partials.map((p) => normalizeBlock(p, schema));
  return blocks.length ? blocks : [normalizeBlock({ type: "paragraph" }, schema)];
}
