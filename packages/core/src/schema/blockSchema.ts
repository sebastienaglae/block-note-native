/**
 * Block schema: the type-level description of which blocks exist, what props
 * they carry, and whether they hold inline content. Rendering lives in the UI
 * package, keyed by `type`; the core stays UI-free.
 */

export interface PropSpec {
  default: string | number | boolean | unknown[];
  /** Optional enum of allowed values (used for validation / UI controls). */
  values?: ReadonlyArray<string | number | boolean>;
}

export type PropSchema = Record<string, PropSpec>;

export interface BlockConfig {
  type: string;
  /** "inline": text-bearing block; "none": void block (divider/image). */
  content: "inline" | "none";
  propSchema: PropSchema;
}

export type BlockSchema = Record<string, BlockConfig>;

/** Props shared by most text blocks. */
export const defaultProps: PropSchema = {
  textColor: { default: "default" },
  backgroundColor: { default: "default" },
  textAlignment: { default: "left", values: ["left", "center", "right"] },
};

export const defaultBlockSpecs: BlockSchema = {
  paragraph: { type: "paragraph", content: "inline", propSchema: { ...defaultProps } },
  heading: {
    type: "heading",
    content: "inline",
    propSchema: { ...defaultProps, level: { default: 1, values: [1, 2, 3] } },
  },
  bulletListItem: { type: "bulletListItem", content: "inline", propSchema: { ...defaultProps } },
  numberedListItem: { type: "numberedListItem", content: "inline", propSchema: { ...defaultProps } },
  checkListItem: {
    type: "checkListItem",
    content: "inline",
    propSchema: { ...defaultProps, checked: { default: false } },
  },
  quote: { type: "quote", content: "inline", propSchema: { ...defaultProps } },
  codeBlock: {
    type: "codeBlock",
    content: "inline",
    propSchema: { language: { default: "text" } },
  },
  divider: { type: "divider", content: "none", propSchema: {} },
  image: {
    type: "image",
    content: "none",
    propSchema: { url: { default: "" }, caption: { default: "" }, previewWidth: { default: 512 } },
  },

  // --- collapsible blocks ---
  toggleListItem: {
    type: "toggleListItem",
    content: "inline",
    propSchema: { ...defaultProps, collapsed: { default: false } },
  },
  toggleHeading: {
    type: "toggleHeading",
    content: "inline",
    propSchema: { ...defaultProps, level: { default: 1, values: [1, 2, 3] }, collapsed: { default: false } },
  },

  // --- media (void) ---
  video: { type: "video", content: "none", propSchema: { url: { default: "" }, caption: { default: "" } } },
  audio: { type: "audio", content: "none", propSchema: { url: { default: "" }, caption: { default: "" } } },
  file: {
    type: "file",
    content: "none",
    propSchema: { url: { default: "" }, name: { default: "" }, size: { default: "" } },
  },
  bookmark: {
    type: "bookmark",
    content: "none",
    propSchema: { url: { default: "" }, title: { default: "" }, description: { default: "" }, image: { default: "" } },
  },
  mapView: {
    type: "mapView",
    content: "none",
    propSchema: { query: { default: "" }, zoom: { default: 13 } },
  },
  pageLink: {
    type: "pageLink",
    content: "none",
    propSchema: { pageId: { default: "" }, title: { default: "Untitled" }, icon: { default: "📄" } },
  },

  // --- table (cells stored as a 2D string array) ---
  table: {
    type: "table",
    content: "none",
    propSchema: { cells: { default: [["", ""], ["", ""]] } },
  },
};

/** Builds the default props object for a block type from its schema. */
export function defaultPropsForType(
  schema: BlockSchema,
  type: string,
): Record<string, unknown> {
  const spec = schema[type];
  const props: Record<string, unknown> = {};
  if (spec) {
    for (const [k, v] of Object.entries(spec.propSchema)) props[k] = v.default;
  }
  return props;
}

/** Merges custom block configs onto the defaults to form a full schema. */
export function createBlockSchema(custom: BlockConfig[] = []): BlockSchema {
  const schema: BlockSchema = { ...defaultBlockSpecs };
  for (const spec of custom) schema[spec.type] = spec;
  return schema;
}
