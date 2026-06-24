# @sebastienaglae/bnn-core

Platform-agnostic engine for a Notion-like, block-based editor: document model, schema, the `Editor` (commands, transforms, history, selection), and Markdown/JSON serialization. **Pure TypeScript — no UI, no DOM, no React.** It powers [`@sebastienaglae/bnn-react`](https://github.com/sebastienaglae/block-note-native/tree/main/packages/react) on both web and React Native.

Part of the [block-note-native](https://github.com/sebastienaglae/block-note-native) monorepo.

## Install

Published to **GitHub Packages** under the `@sebastienaglae` scope. Add an `.npmrc` next to your `package.json`:

```
@sebastienaglae:registry=https://npm.pkg.github.com
```

Then:

```bash
npm install @sebastienaglae/bnn-core
```

> Installing from GitHub Packages requires authenticating `npm` to GitHub (a personal access token with `read:packages`), even for public packages — see [GitHub's docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

## Usage

```ts
import { Editor, blocksToMarkdown } from "@sebastienaglae/bnn-core";

const editor = new Editor({ initialContent: [{ type: "heading", props: { level: 1 }, content: "Hi" }] });

const [p] = editor.insertBlocks([{ type: "paragraph", content: "world" }], editor.document[0].id, "after");
editor.updateBlock(p.id, { type: "bulletListItem" });

editor.setSelection({ blockId: p.id, start: 0, end: 5 });
editor.toggleStyles({ bold: true });          // operates on the current selection
editor.nestBlock(p.id);                        // Tab / Shift-Tab equivalents
editor.undo(); editor.redo();

console.log(blocksToMarkdown(editor.document));
```

The `Editor` is an observable: `subscribe(listener)` + `getSnapshot()` make it a drop-in source for React's `useSyncExternalStore`.

## Highlights

- **Model:** `Block { id, type, props, content, children }`; inline content is styled text, links, or custom inline.
- **Transforms:** split / merge / indent / outdent / change-type, plus Markdown input rules (`# `, `- `, `1. `, `[] `, `> `, ` ``` `, `---`).
- **History:** undo/redo over content and page metadata.
- **Serialization:** `blocksToMarkdown` / `markdownToBlocks`, `blocksToJSON` / `jsonToBlocks`. `blocksToMarkdown` accepts optional per-type `MarkdownSerializers` so custom & media blocks export meaningfully.

## License

[MIT](./LICENSE) © Sébastien Aglaé
