# 📥 Embedding BlockNote in your website

This guide shows how to **feed content into** the editor from the outside (an API,
a CMS, a database) and **get content back out** — the typical flow when you embed
BlockNote on a web app.

The data model is plain JSON (an array of blocks), so it travels over the wire
and into your database unchanged.

---

## 1. Mount the editor with initial content

`useCreateEditor` builds the editor **once** (it ignores later changes to its
arguments — it is not a controlled prop). Pass your stored blocks as
`initialContent`:

```tsx
import {
  BlockNoteView,
  useCreateEditor,
  createBlockNoteSchema,
} from "@sebastienaglae/bnn-react";

const schema = createBlockNoteSchema({ /* blockSpecs, inlineSpecs */ });

function Editor({ initialBlocks }) {
  const editor = useCreateEditor({
    initialContent: initialBlocks,           // PartialBlock[] from your backend
    initialMeta: { icon: "📄", title: "My doc" },
    blockSpecs: schema.blockSpecs,
    inlineSpecs: schema.inlineSpecs,
  });

  return (
    <BlockNoteView
      editor={editor}
      blockRenderers={schema.blockRenderers}
      inlineRenderers={schema.inlineRenderers}
      slashItems={schema.slashItems}
      people={[{ id: "u1", name: "Alice" }]}   // optional: @-mentions
    />
  );
}
```

`initialContent` is a `PartialBlock[]` — the same shape `blocksToMarkdown` /
`blocksToJSON` round-trip. Missing fields (ids, default props) are filled in.

---

## 2. Read changes back out (autosave)

The `Editor` is an observable. Subscribe directly, or use the `useEditorState`
hook (a thin `useSyncExternalStore` wrapper) to re-render and persist on every
change:

```tsx
import { useEffect } from "react";
import { useEditorState, blocksToJSON } from "@sebastienaglae/bnn-react";

function useAutosave(editor, docId) {
  const version = useEditorState(editor); // changes on every mutation
  useEffect(() => {
    const handle = setTimeout(() => {
      // editor.document is the live block tree; editor.meta is icon/cover/title
      void fetch(`/api/docs/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: editor.document, meta: editor.meta }),
      });
    }, 500); // debounce
    return () => clearTimeout(handle);
  }, [version, editor, docId]);
}
```

Without React, subscribe imperatively:

```ts
const unsubscribe = editor.subscribe(() => {
  save(editor.toJSON()); // { meta, blocks }
});
```

---

## 3. Push new content in *after* mount

To swap the whole document (e.g. the user picked a different page, or content
arrived from the server), call **`replaceDocument`**:

```ts
editor.replaceDocument(newBlocks, { icon: "🚀", title: "Another doc" });
```

For surgical updates, use the block API (all take/return plain data):

```ts
editor.insertBlocks([{ type: "paragraph", content: "Hi" }], referenceId, "after");
editor.updateBlock(id, { type: "heading", props: { level: 2 } });
editor.removeBlocks([id]);
editor.replaceBlocks([id], [{ type: "quote", content: "Replaced" }]);
editor.setBlockContent(id, inlineContent); // fast path for rich text
```

---

## 4. Import / export formats

```ts
import {
  blocksToJSON, jsonToBlocks,
  blocksToMarkdown, markdownToBlocks,
} from "@sebastienaglae/bnn-react";

// JSON — lossless, ideal for storage
const json = blocksToJSON(editor.document);
const blocks = jsonToBlocks(json);          // -> PartialBlock[]
editor.replaceDocument(blocks);

// Markdown — for display/export. Pass the schema's serializers so custom &
// media blocks (video/audio/file/bookmark/map/table, mentions) export properly.
const md = blocksToMarkdown(editor.document, schema.markdownSerializers);
const fromMd = markdownToBlocks(md);
```

> Custom/media markdown export is opt-in per spec: give a block spec a
> `toMarkdown(block, { inline })` (or an inline spec a `toMarkdown(ic)`) and it's
> collected into `schema.markdownSerializers` automatically. See the callout +
> mention examples in [`packages/demo-shared/src/index.tsx`](packages/demo-shared/src/index.tsx).

---

## 5. End-to-end shape

```
  your backend            <BlockNoteView>                  your backend
 ┌────────────┐   blocks  ┌──────────────┐   subscribe /  ┌────────────┐
 │  GET /doc  │ ────────► │ useCreate-   │   useEditor-   │  PUT /doc  │
 │  { blocks }│           │ Editor(...)  │ ────────────►  │  { blocks }│
 └────────────┘           └──────────────┘     state      └────────────┘
                                 ▲
              replaceDocument()  │  push server updates back in
```

- **In:** `initialContent` at mount, then `replaceDocument` / block ops.
- **Out:** `editor.document` + `editor.meta` via `subscribe` / `useEditorState`,
  serialized with `blocksToJSON` or `blocksToMarkdown`.

---

## 6. Other host-supplied props worth knowing

| Prop | Purpose |
|---|---|
| `people` | List of `{ id, name }` enabling the `@`-mention typeahead |
| `renderMention` | Customize what inline node a chosen mention inserts |
| `t` | Localization — see [TRANSLATING.md](TRANSLATING.md) |
| `theme` / `accentColor` / `font` | Theming |
| `colorOverrides` | Override individual theme color tokens (e.g. `{ menuBackground: "#111", border: "#333" }`) without building a whole `Theme` — recolors the slash menu and block surfaces |
| `autoMenuOnEmpty` | When the caret sits on an empty paragraph, open the command menu automatically (web; default `true`). Set `false` to require typing `/` |
| `icons` | Override any lucide icon |
| `onOpenPage` | Called when a `pageLink` block is opened |
| `slashItems` / `blockRenderers` / `inlineRenderers` | Custom blocks & commands |

Video blocks accept URLs from YouTube, Vimeo, Loom, Dailymotion, Wistia,
Streamable and Twitch (or a direct `.mp4`); the host/provider is detected
automatically and embedded.

See the runnable [web demo](apps/web/src/App.tsx) for a complete multi-page host
that stores documents in `localStorage` and swaps them with `replaceDocument`.
