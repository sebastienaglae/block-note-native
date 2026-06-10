# BlockNote Native

A Notion-like, block-based rich-text editor (in the spirit of [BlockNote](https://github.com/TypeCellOS/BlockNote)) that runs on **web** and **React Native** with the **same features**, built from a single shared core. Supports **custom blocks and custom inline content**. No live collaboration (by design).

> BlockNote itself is built on ProseMirror/TipTap, which is DOM-only and cannot run on React Native. This project is a **from-scratch** implementation: a platform-agnostic core plus a thin, per-platform editable surface, so the *same* document model, commands, slash menu, toolbar, drag-to-reorder, and custom components work everywhere.

---

## ✨ Features

- **Block types:** paragraph, headings (1–3), bulleted / numbered / to-do lists, quote, code block, divider, image.
- **Inline formatting:** bold, italic, underline, strikethrough, inline code, links, text color & highlight.
- **Slash menu** (`/`) — filterable, grouped, keyboard-navigable, extensible.
- **Formatting toolbar** that floats over the selection (web) / docks above the keyboard (native).
- **Side menu** per block with an add button and a **drag handle** to reorder.
- **Keyboard model:** Enter splits, Backspace-at-start merges, **Tab / Shift-Tab** nest/un-nest, arrow navigation across blocks.
- **Markdown input rules:** `# `, `## `, `- `, `1. `, `[] `, `> `, ` ``` `, `---`.
- **Undo / redo**, JSON & Markdown **import/export**, localStorage persistence (web demo).
- **Light / dark themes.**
- **Custom components** — define a block or inline content **once** (with React Native primitives) and it renders on both platforms.

---

## 🏗 Architecture

Three layers. The trick that makes "same features on both platforms" real is **[react-native-web](https://necolas.github.io/react-native-web/)**: all UI chrome and custom components are written once with RN primitives (`View`, `Text`, `Pressable`) and run on web via RNW. Only the low-level editable surface is platform-split.

```
block-note-native/                 # npm-workspaces monorepo
├─ packages/
│  ├─ core/         @bnn/core        Pure-TS engine: model, schema, Editor, transforms, history, markdown. No UI.
│  ├─ react/        @bnn/react       Cross-platform UI (RN primitives + RNW) + custom-component API.
│  └─ demo-shared/  @bnn/demo-shared ONE definition of demo custom components, used by both apps.
└─ apps/
   ├─ web/          Vite + React + react-native-web
   └─ native/       Expo (SDK 52)
```

**The editable surface is the only platform-split file:**

| File | Used on | Implementation |
|---|---|---|
| `packages/react/src/editable/RichTextInput.tsx` | Web (Vite) **and** Expo web | controlled `contentEditable` ⇄ model |
| `packages/react/src/editable/RichTextInput.native.tsx` | iOS / Android | controlled `TextInput` + segment diffing |

Both implement the same `RichTextInputProps` contract, so everything above them (blocks, menus, drag, custom components) is shared.

---

## 🚀 Getting started

Requires Node 18+.

```bash
npm install        # installs all workspaces
npm test           # runs the @bnn/core unit tests
```

### Run the web demo (Vite)

```bash
npm run dev:web    # → http://localhost:5173
```

### Run the native demo (Expo)

```bash
npm run start -w @bnn/native-demo        # Expo dev server (press i / a / w)
# or directly:
npm run web     -w @bnn/native-demo      # Expo on web (react-native-web)
npm run ios     -w @bnn/native-demo      # iOS simulator (macOS)
npm run android -w @bnn/native-demo      # Android emulator / device
```

> **Note:** iOS/Android require a simulator/emulator or the Expo Go app on a device. Expo-web and the Vite app both render the full editor via react-native-web and are the quickest way to try it.

### Type-check everything

```bash
npm run typecheck
```

---

## 🧩 Custom components

This is the headline feature. Define a component **once** with `@bnn/react`'s cross-platform primitives; it works on web and native.

### A custom block

```tsx
import { createReactBlockSpec, View, Text } from "@bnn/react";

export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    content: "inline",                              // "inline" = has editable text; "none" = void block
    propSchema: { emoji: { default: "💡" }, color: { default: "blue" } },
  },
  {
    // `render` receives the block, the editor, the theme, and `InlineContentView`
    // (place it wherever the editable text should go — the BlockNote `contentRef` equivalent).
    render: ({ block, theme, InlineContentView }) => (
      <View style={{ flexDirection: "row", backgroundColor: theme.highlightColors[String(block.props.color)], borderRadius: 6, padding: 12 }}>
        <Text style={{ fontSize: 18, marginRight: 10 }}>{String(block.props.emoji)}</Text>
        <View style={{ flex: 1 }}>{InlineContentView({ placeholder: "Write a note…" })}</View>
      </View>
    ),
    // Optional: auto-generate a slash-menu command for this block.
    slashMenu: { title: "Callout", icon: "💡", group: "Custom", aliases: ["note", "info"] },
  },
);
```

### A custom inline content (e.g. a mention)

```tsx
import { createReactInlineContentSpec, View, Text } from "@bnn/react";

export const MentionInline = createReactInlineContentSpec(
  { type: "mention", content: "none", propSchema: { user: { default: "" } } },
  {
    render: ({ inlineContent, theme }) => (
      <View style={{ backgroundColor: theme.colors.accentSoft, borderRadius: 4, paddingHorizontal: 4 }}>
        <Text style={{ color: theme.colors.accent, fontWeight: "500" }}>@{String(inlineContent.props.user)}</Text>
      </View>
    ),
  },
);
```

Insert it anywhere with `editor.insertInlineContent([{ type: "mention", props: { user: "Alice" }, content: [{ type: "text", text: "@Alice", styles: {} }] }])`.

### Assemble the schema and mount the editor

```tsx
import { BlockNoteView, useCreateEditor, createBlockNoteSchema } from "@bnn/react";

const schema = createBlockNoteSchema({
  blockSpecs: [CalloutBlock],
  inlineSpecs: [MentionInline],
  // extraSlashItems: [...]
});

function Editor() {
  const editor = useCreateEditor({
    initialContent: [{ type: "paragraph", content: "Hello!" }],
    blockSpecs: schema.blockSpecs,
    inlineSpecs: schema.inlineSpecs,
  });
  return (
    <BlockNoteView
      editor={editor}
      blockRenderers={schema.blockRenderers}
      inlineRenderers={schema.inlineRenderers}
      slashItems={schema.slashItems}
    />
  );
}
```

See [`packages/demo-shared/src/index.tsx`](packages/demo-shared/src/index.tsx) for the complete, real example — the **same file** is imported by both the [web](apps/web/src/App.tsx) and [native](apps/native/App.tsx) demos.

---

## 📚 Core API (`@bnn/core`)

The `Editor` is framework-agnostic and fully testable on its own:

```ts
import { Editor, blocksToMarkdown } from "@bnn/core";

const editor = new Editor({ initialContent: [{ type: "heading", content: "Hi" }] });

editor.insertBlocks([{ type: "paragraph", content: "world" }], editor.document[0].id, "after");
editor.updateBlock(id, { type: "bulletListItem" });
editor.toggleStyles({ bold: true });        // operates on the current selection
editor.nestBlock(id); editor.unnestBlock(id);
editor.moveBlock(id, targetId, "after");
editor.undo(); editor.redo();

console.log(blocksToMarkdown(editor.document));
```

`subscribe(listener)` + `getSnapshot()` make it a drop-in source for React's `useSyncExternalStore` (see `useEditorState`).

---

## ⚠️ Known limitations (MVP scope)

- **No live collaboration** — intentionally excluded.
- **Selection** is within a single block (covers caret + range formatting). Cross-block selection isn't implemented.
- **Drag-to-reorder** targets top-level blocks; use **Tab / Shift-Tab** to change nesting.
- On **native (iOS/Android)**, text typed inside a styled run inherits that run's style (Notion-like). The richest inline-editing fidelity is on web; the native `TextInput` surface is implemented but is best validated on a real device/emulator.
- The web `contentEditable` does a best-effort job importing pasted HTML styling.

---

## 🧪 What's verified

- `@bnn/core`: 17 unit tests (split/merge/indent, inline mark toggling, markdown round-trip).
- Web (Vite): rendering, editing, slash menu (+ custom items), formatting toolbar, markdown rules, Tab nesting, persistence — all exercised.
- Native (Expo): bundles cleanly through Metro in the monorepo and renders the full editor (incl. custom block + mention) via react-native-web; the same shared code path.
