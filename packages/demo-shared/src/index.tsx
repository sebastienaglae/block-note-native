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
} from "@sebastienaglae/bnn-react";

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
  { type: "heading", props: { level: 2 }, content: "More block types" },
  {
    type: "toggleListItem",
    props: { collapsed: false },
    content: "Toggle list (click ▸ to collapse)",
    children: [{ type: "bulletListItem", content: "Hidden when collapsed" }],
  },
  { type: "bookmark", props: { url: "https://github.com/TypeCellOS/BlockNote", title: "BlockNote on GitHub" } },
  {
    type: "table",
    props: {
      cells: [
        ["Block", "Platform"],
        ["Toggle / table / map", "web + native"],
      ],
    },
  },
  { type: "paragraph", content: "Try /video, /audio, /file, /map, /table, /toggle, /emoji…" },
];

/** A page that contains one of every block type. */
export const allElementsContent: PartialBlock[] = [
  { type: "heading", props: { level: 1 }, content: "Heading 1" },
  { type: "heading", props: { level: 2 }, content: "Heading 2" },
  { type: "heading", props: { level: 3 }, content: "Heading 3" },
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Paragraph with ", styles: {} },
      { type: "text", text: "bold", styles: { bold: true } },
      { type: "text", text: ", ", styles: {} },
      { type: "text", text: "italic", styles: { italic: true } },
      { type: "text", text: ", ", styles: {} },
      { type: "text", text: "underline", styles: { underline: true } },
      { type: "text", text: ", ", styles: {} },
      { type: "text", text: "strike", styles: { strike: true } },
      { type: "text", text: ", ", styles: {} },
      { type: "text", text: "code", styles: { code: true } },
      { type: "text", text: ", a ", styles: {} },
      { type: "link", href: "https://example.com", content: [{ type: "text", text: "link", styles: {} }] },
      { type: "text", text: ", a mention ", styles: {} },
      { type: "mention", props: { user: "Alice" }, content: [{ type: "text", text: "@Alice", styles: {} }] },
      { type: "text", text: " and emoji 🎉.", styles: {} },
    ],
  },
  { type: "callout", props: { emoji: "💡", color: "blue" }, content: "Callout (custom block)" },
  { type: "bulletListItem", content: "Bulleted list item" },
  { type: "numberedListItem", content: "Numbered list item" },
  { type: "checkListItem", props: { checked: true }, content: "Checked to-do" },
  { type: "checkListItem", props: { checked: false }, content: "Unchecked to-do" },
  {
    type: "toggleListItem",
    props: { collapsed: false },
    content: "Toggle list",
    children: [{ type: "paragraph", content: "Inside the toggle" }],
  },
  {
    type: "toggleHeading",
    props: { level: 2, collapsed: false },
    content: "Toggle heading",
    children: [{ type: "paragraph", content: "Inside the toggle heading" }],
  },
  { type: "quote", content: "A quote block." },
  { type: "codeBlock", props: { language: "ts" }, content: "const x: number = 42;" },
  { type: "divider" },
  { type: "image", props: { url: "https://picsum.photos/seed/bnn/800/400", caption: "An image" } },
  { type: "video", props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
  { type: "audio", props: { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" } },
  { type: "file", props: { url: "https://example.com/report.pdf", name: "report.pdf" } },
  { type: "bookmark", props: { url: "https://github.com/TypeCellOS/BlockNote", title: "BlockNote on GitHub" } },
  { type: "mapView", props: { query: "Eiffel Tower, Paris" } },
  {
    type: "table",
    props: {
      cells: [
        ["Name", "Type"],
        ["Alpha", "A"],
        ["Beta", "B"],
      ],
    },
  },
  { type: "paragraph", content: "End of the gallery." },
];
