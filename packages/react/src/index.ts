// Re-export the core so consumers can import everything from one place.
export * from "@sebastienaglae/bnn-core";

// Cross-platform primitives (resolve to react-native-web on web, react-native on
// native). Re-exported so custom components & demos need not depend on react-native types directly.
export { View, Text, Pressable, TextInput, ScrollView, Image, Platform, StyleSheet } from "react-native";

// Editor view + hooks
export { BlockNoteView, type BlockNoteViewProps } from "./components/Editor";
export { useCreateEditor, useEditorState } from "./hooks/useEditor";
export { BnnProvider, useBnn, type BnnContextValue, type BlockLayout } from "./context";

// Theme
export { lightTheme, darkTheme, withAccent, withColors, withFont, type Theme, type FontChoice } from "./theme/theme";

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
  type BlockMarkdownSerializer,
  type InlineMarkdownSerializer,
} from "./spec";

// Default renderers / slash items (for extension)
export { defaultBlockRenderers } from "./components/blocks/defaultBlocks";
export { defaultSlashItems } from "./ui/defaultSlashItems";

// Editable surface (advanced; normally used internally)
export { RichTextInput } from "./editable/RichTextInput";

// Extra UI building blocks
export { EmojiPicker } from "./ui/EmojiPicker";
export { PageHeader } from "./components/PageHeader";
export { PageTree, type PageNode, type DropPosition } from "./ui/PageTree";

// Icons (lucide, overridable)
export { Icon } from "./icons/Icon";
export { IconsProvider, type IconOverrides, type IconComponentProps } from "./icons/IconContext";
export type { IconName } from "./icons/iconNames";

// i18n
export { I18nProvider, useT, type TFunction } from "./i18n/I18nContext";
export { enLabels, type LabelKey } from "./i18n/labels";

// Types
export type {
  BlockRenderer,
  BlockRenderProps,
  InlineRenderer,
  InlineRenderProps,
  SlashMenuItem,
  MentionUser,
  RichTextInputProps,
  EditableSelection,
  BlockTextStyle,
} from "./types";
