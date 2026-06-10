/** Inline content schema: custom inline content types (e.g. "@mention"). */
import type { PropSchema } from "./blockSchema";

export interface InlineContentConfig {
  type: string;
  /** "styled": holds editable styled text; "none": atomic (e.g. mention chip). */
  content: "styled" | "none";
  propSchema: PropSchema;
}

export type InlineSchema = Record<string, InlineContentConfig>;

/** Built-in inline content kinds ("text" and "link" are handled structurally). */
export const defaultInlineSpecs: InlineSchema = {};

export function createInlineSchema(custom: InlineContentConfig[] = []): InlineSchema {
  const schema: InlineSchema = { ...defaultInlineSpecs };
  for (const spec of custom) schema[spec.type] = spec;
  return schema;
}
