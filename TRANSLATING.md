# 🌍 Translating BlockNote Native

Every user-facing string in the editor goes through a single function:

```ts
t(key: string, fallback: string) => string
```

There are **no hard-coded strings** in the UI. To localize the editor you supply
your own `t` and a catalog of translated values. This works with any i18n library
(i18next, react-intl, LinguiJS, FormatJS) or a plain object — `t` is just a
`(key, fallback) => string` function.

---

## 1. The English catalog (`enLabels`)

`enLabels` is the complete, authoritative list of keys and their English values:

```ts
import { enLabels, type LabelKey } from "@sebastienaglae/bnn-react";

// enLabels looks like:
// {
//   "bnn.slash.search": "Search blocks…",
//   "bnn.block.text": "Text",
//   "bnn.block.duplicate": "Duplicate",
//   "bnn.block.delete": "Delete",
//   "bnn.toolbar.bold": "Bold",
//   "bnn.ph.paragraph": "Type '/' for commands",
//   ... (slash menu, block names, placeholders, media, toolbar, side/block menu,
//        page header, tree, table, emoji picker)
// }

type LabelKey = keyof typeof enLabels; // a union of every key, for type-safety
```

Key groups (prefix → area):

| Prefix | Area |
|---|---|
| `bnn.slash.*` | Slash menu search bar + group headings |
| `bnn.block.*` | Block names/subtitles + **duplicate / delete** menu |
| `bnn.ph.*` | Block placeholders |
| `bnn.media.*` | Media empty-state prompts + buttons |
| `bnn.toolbar.*` | Formatting toolbar |
| `bnn.side.*` | Block side menu (add / drag / options) |
| `bnn.header.*` | Page header (cover / icon) |
| `bnn.tree.*` | Page tree |
| `bnn.table.*` | Table controls |
| `bnn.emoji.*` | Emoji picker |

---

## 2. Build a translated catalog

Create one object per locale, with the **same keys** as `enLabels`. Typing it as
`Record<LabelKey, string>` makes TypeScript flag any key you forget or misspell:

```ts
// locales/fr.ts
import { type LabelKey } from "@sebastienaglae/bnn-react";

export const frLabels: Record<LabelKey, string> = {
  "bnn.slash.search": "Rechercher des blocs…",
  "bnn.slash.empty": "Aucun bloc trouvé",
  "bnn.slash.group.basic": "Blocs de base",
  "bnn.block.text": "Texte",
  "bnn.block.duplicate": "Dupliquer",
  "bnn.block.delete": "Supprimer",
  "bnn.toolbar.bold": "Gras",
  "bnn.ph.paragraph": "Tapez « / » pour les commandes",
  // … translate every key in enLabels …
};
```

> Tip: start from `enLabels` so you never miss a key:
> ```ts
> const frLabels = { ...enLabels, "bnn.block.text": "Texte", /* override the rest */ };
> ```

---

## 3. Wire it up

### Option A — a plain function (no library)

```tsx
import { BlockNoteView, enLabels } from "@sebastienaglae/bnn-react";
import { frLabels } from "./locales/fr";

const catalogs = { en: enLabels, fr: frLabels };
const locale = "fr";

const t = (key: string, fallback: string) =>
  (catalogs[locale] as Record<string, string>)[key] ?? fallback;

<BlockNoteView editor={editor} t={t} />;
```

### Option B — i18next

```tsx
import i18next from "i18next";
import { BlockNoteView, enLabels } from "@sebastienaglae/bnn-react";
import { frLabels } from "./locales/fr";

i18next.init({
  lng: "fr",
  resources: {
    en: { translation: enLabels },
    fr: { translation: frLabels },
  },
});

// Adapt i18next's signature to (key, fallback).
const t = (key: string, fallback: string) => i18next.t(key, { defaultValue: fallback });

<BlockNoteView editor={editor} t={t} />;
```

The same `t` prop is accepted by **`PageTree`** too — pass it everywhere you mount
a BlockNote component so the whole UI is translated:

```tsx
<PageTree pages={pages} activeId={id} t={t} /* …handlers… */ />
```

---

## 4. Translate your own custom blocks

Strings **inside** your custom block/inline renderers are yours to translate — the
renderer receives `t` in its props:

```tsx
createReactBlockSpec(config, {
  render: ({ t, InlineContentView }) =>
    InlineContentView({ placeholder: t("myapp.callout.placeholder", "Write a note…") }),
});
```

Add `myapp.*` keys to your own catalogs alongside the `bnn.*` ones.

---

## 5. Checklist for a new language

1. Copy `enLabels`’ keys into a new `Record<LabelKey, string>`.
2. Translate every value (TypeScript will error on missing/extra keys).
3. Register the catalog with your i18n library (or a plain map).
4. Pass `t` to **every** `<BlockNoteView>` and `<PageTree>`.
5. Translate any custom-block strings via the `t` passed to your renderers.

That's it — no fork, no string extraction step, no rebuild of the library.
