// Re-export the core so consumers can import everything from one place.
export * from "@bnn/core";

// Cross-platform primitives (resolve to react-native-web on web, react-native on
// native). Re-exported so custom components & demos need not depend on react-native types directly.
export { View, Text, Pressable, TextInput, ScrollView, Image, Platform, StyleSheet } from "react-native";

// Editor view + hooks
export { BlockNoteView, type BlockNoteViewProps } from "./components/Editor";
export { useCreateEditor, useEditorState } from "./hooks/useEditor";
export { BnnProvider, useBnn, type BnnContextValue, type BlockLayout } from "./context";

// Theme
export { lightTheme, darkTheme, type Theme } from "./theme/theme";

// Custom component API
export {
  createReactBlockSpec,
  createReactInlineContentSpec,
  createBlockNoteSchema,
  type ReactBlockSpec,
  type ReactInlineContentSpec,
  type BlockNoteSchema,
  type BlockNoteSchemaInput,
  type CreateReactBlockSpecOptions,
  type BlockSlashMenuConfig,
} from "./spec";

// Default renderers / slash items (for extension)
export { defaultBlockRenderers } from "./components/blocks/defaultBlocks";
export { defaultSlashItems } from "./ui/defaultSlashItems";

// Editable surface (advanced; normally used internally)
export { RichTextInput } from "./editable/RichTextInput";

// Types
export type {
  BlockRenderer,
  BlockRenderProps,
  InlineRenderer,
  InlineRenderProps,
  SlashMenuItem,
  RichTextInputProps,
  EditableSelection,
  BlockTextStyle,
} from "./types";
