# @sebastienaglae/bnn-react

Cross-platform (web + React Native) UI for a Notion-like block editor: the editor view, blocks, slash menu, @-mentions, formatting toolbar, side menu + drag-to-reorder, hover-to-delete on any block, page tree, page header, **custom blocks & inline content**, i18n, and overridable icons.

Written once with React Native primitives and run on web via [react-native-web](https://necolas.github.io/react-native-web/) — only the low-level editable surface is platform-split (`RichTextInput.tsx` / `RichTextInput.native.tsx`). Built on [`@sebastienaglae/bnn-core`](https://github.com/sebastienaglae/block-note-native/tree/main/packages/core).

Part of the [block-note-native](https://github.com/sebastienaglae/block-note-native) monorepo — see it for the full feature list, architecture, and runnable web/native demos.

## Install

Published to **GitHub Packages** under the `@sebastienaglae` scope. Add an `.npmrc`:

```
@sebastienaglae:registry=https://npm.pkg.github.com
```

Then install the library and its peers:

```bash
npm install @sebastienaglae/bnn-react @sebastienaglae/bnn-core react

# Web also needs:
npm install react-dom react-native-web lucide-react

# React Native also needs:
npm install react-native lucide-react-native react-native-svg react-native-webview
```

> Peer deps are declared `optional` so a web-only app doesn't pull native modules and vice-versa. `react-native-webview` is only needed if you use the video/map/bookmark/audio blocks on native. Installing from GitHub Packages requires authenticating `npm` to GitHub (a token with `read:packages`).

## Usage

```tsx
import { BlockNoteView, useCreateEditor } from "@sebastienaglae/bnn-react";

function Editor() {
  const editor = useCreateEditor({
    initialContent: [{ type: "paragraph", content: "Hello!" }],
  });
  return <BlockNoteView editor={editor} accentColor="#7c3aed" />;
}
```

### Custom components (the headline feature)

Define a block or inline content **once** with cross-platform primitives; it renders on web and native:

```tsx
import { createReactBlockSpec, createBlockNoteSchema, View, Text } from "@sebastienaglae/bnn-react";

const Callout = createReactBlockSpec(
  { type: "callout", content: "inline", propSchema: { emoji: { default: "💡" } } },
  {
    render: ({ block, InlineContentView }) => (
      <View style={{ flexDirection: "row", padding: 12 }}>
        <Text>{String(block.props.emoji)}</Text>
        <View style={{ flex: 1 }}>{InlineContentView({ placeholder: "Write a note…" })}</View>
      </View>
    ),
    slashMenu: { title: "Callout", icon: "💡", group: "Custom" },
  },
);

const schema = createBlockNoteSchema({ blockSpecs: [Callout] });
```

Standalone, composable pieces — `PageTree`, `BlockNoteView` — can be placed anywhere. Every string is translatable via a `t(key, fallback)` prop (`enLabels` is the full catalog). Icons come from lucide and are individually overridable.

## License

[MIT](./LICENSE) © Sébastien Aglaé
