// Model
export type {
  Block,
  BlockDocument,
  CustomInlineContent,
  EditorSelection,
  InlineContent,
  Link,
  PageMeta,
  PartialBlock,
  PartialInlineContent,
  StyledText,
  Styles,
  TextSelection,
} from "./model/types";
export { TITLE_BLOCK_ID } from "./model/types";
export { normalizeBlock, normalizeDocument } from "./model/normalize";
export {
  flattenBlocks,
  getBlock,
  insertRelative,
  locateBlock,
  removeBlock,
  replaceBlock,
  type BlockLocation,
  type BlockReplacer,
} from "./model/tree";

// Schema
export {
  createBlockSchema,
  defaultBlockSpecs,
  defaultProps,
  defaultPropsForType,
  type BlockConfig,
  type BlockSchema,
  type PropSchema,
  type PropSpec,
} from "./schema/blockSchema";
export {
  createInlineSchema,
  defaultInlineSpecs,
  type InlineContentConfig,
  type InlineSchema,
} from "./schema/inlineSchema";

// Editor
export { Editor, type EditorOptions } from "./editor/Editor";
export { History, type Snapshot } from "./editor/history";
export {
  changeBlockType,
  indentBlock,
  isListType,
  mergeWithPrevious,
  outdentBlock,
  splitBlock,
  type TransformResult,
} from "./editor/transforms";

// Inline utilities
export {
  applyStylesToRange,
  icText,
  inlineLength,
  inlineToString,
  insertText,
  isLink,
  isStyledText,
  normalizeInline,
  partialToInline,
  rangeHasStyle,
  sameStyles,
  sliceInline,
  spliceInline,
  stylesAt,
  type StyleMode,
} from "./util/inline";
export { createId } from "./util/id";

// Commands
export { matchMarkdownInput, type MarkdownInputMatch } from "./commands/markdownInput";

// Serialization
export {
  blocksToJSON,
  blocksToMarkdown,
  jsonToBlocks,
  markdownToBlocks,
  type MarkdownSerializers,
} from "./markdown/serialize";
