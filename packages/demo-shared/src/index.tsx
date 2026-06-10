/**
 * Shared demo: ONE definition of custom components + initial content, imported
 * unchanged by both the web (Vite) and native (Expo) apps — the "write once,
 * run on both platforms" proof.
 */
import {
  Text,
  View,
  createBlockNoteSchema,
  createReactBlockSpec,
  createReactInlineContentSpec,
  type PartialBlock,
  type SlashMenuItem,
} from "@bnn/react";

/** Custom BLOCK: a colored callout box with an emoji and editable text. */
export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    content: "inline",
    propSchema: { emoji: { default: "💡" }, color: { default: "blue" } },
  },
  {
    render: ({ block, theme, InlineContentView }) => {
      const color = String(block.props.color ?? "blue");
      const bg = theme.highlightColors[color] ?? theme.colors.backgroundSecondary;
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            backgroundColor: bg,
            borderRadius: theme.radius,
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ fontSize: 18, marginRight: 10, lineHeight: 24 }}>
            {String(block.props.emoji ?? "💡")}
          </Text>
          <View style={{ flex: 1 }}>
            {InlineContentView({ textStyle: { fontSize: 16 }, placeholder: "Write a note…" })}
          </View>
        </View>
      );
    },
    slashMenu: {
      title: "Callout",
      subtitle: "Highlighted info box",
      icon: "💡",
      group: "Custom",
      aliases: ["callout", "note", "info", "tip", "warning"],
      props: { emoji: "💡", color: "blue" },
    },
  },
);

/** Custom INLINE content: an @mention chip. */
export const MentionInline = createReactInlineContentSpec(
  { type: "mention", content: "none", propSchema: { user: { default: "" } } },
  {
    render: ({ inlineContent, theme }) => (
      <View
        style={{
          backgroundColor: theme.colors.accentSoft,
          borderRadius: 4,
          paddingHorizontal: 4,
          paddingVertical: 1,
        }}
      >
        <Text style={{ color: theme.colors.accent, fontWeight: "500" }}>
          @{String(inlineContent.props.user ?? "user")}
        </Text>
      </View>
    ),
  },
);

const MENTION_USERS = ["Alice", "Bob", "Charlie"];

export const mentionSlashItems: SlashMenuItem[] = MENTION_USERS.map((user) => ({
  key: `mention-${user}`,
  title: `Mention @${user}`,
  subtitle: "Insert a mention",
  icon: "@",
  group: "Inline",
  aliases: ["mention", "@", user.toLowerCase()],
  execute: (editor) =>
    editor.insertInlineContent([
      { type: "mention", props: { user }, content: [{ type: "text", text: `@${user}`, styles: {} }] },
    ]),
}));

/** Assembled schema: defaults + the custom block + custom inline + mention commands. */
export const demoSchema = createBlockNoteSchema({
  blockSpecs: [CalloutBlock],
  inlineSpecs: [MentionInline],
  extraSlashItems: mentionSlashItems,
});

export const demoInitialContent: PartialBlock[] = [
  { type: "heading", props: { level: 1 }, content: "📝 BlockNote-style editor" },
  {
    type: "paragraph",
    content: [
      { type: "text", text: "A Notion-like block editor that runs on ", styles: {} },
      { type: "text", text: "web", styles: { bold: true } },
      { type: "text", text: " and ", styles: {} },
      { type: "text", text: "React Native", styles: { bold: true } },
      { type: "text", text: " from one shared core.", styles: {} },
    ],
  },
  {
    type: "callout",
    props: { emoji: "💡", color: "blue" },
    content: "This whole callout is a custom block — defined once, rendered on both platforms.",
  },
  { type: "heading", props: { level: 2 }, content: "Try it out" },
  { type: "bulletListItem", content: "Type '/' for the slash menu" },
  { type: "bulletListItem", content: [{ type: "text", text: "Select text to format it (bold, italic, ", styles: {} }, { type: "text", text: "code", styles: { code: true } }, { type: "text", text: ")", styles: {} }] },
  { type: "checkListItem", props: { checked: true }, content: "Press Tab to nest, drag the handle to reorder" },
  { type: "checkListItem", props: { checked: false }, content: "Type # , - , 1. , > for markdown shortcuts" },
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Mentions work inline too: ", styles: {} },
      { type: "mention", props: { user: "Alice" }, content: [{ type: "text", text: "@Alice", styles: {} }] },
      { type: "text", text: " — try '/mention'.", styles: {} },
    ],
  },
  { type: "quote", content: "Same features, two platforms, no live collaboration." },
  {
    type: "codeBlock",
    props: { language: "ts" },
    content: "const editor = new Editor({ initialContent });",
  },
];
