# Changelog

All notable changes to `@sebastienaglae/bnn-core` and `@sebastienaglae/bnn-react`.
This project adheres to [Semantic Versioning](https://semver.org/). Releases are cut from git tags (`vX.Y.Z`).

## [0.7.0]

### Added

- Configurable media options: restrict video providers, choose Google Maps, Apple Maps, or OpenStreetMap links, and plug in asynchronous image search providers with selectable results.
- Editor updates now skip redundant block-property mutations.

## [0.6.0]

### Added

- **Readonly preview mode** — empty blocks are omitted, editor placeholders and command menus are hidden, and block renderers receive `readonly` / `isReadOnly` state.
- **Disabled components** — optional editor UI components can be disabled with `disableComponents`.
- **Document validation** — exported `validateDocument` and `isValidDocument` helpers check documents against their schemas.

### Fixed

- Readonly blocks and media components, including empty video editors, are no longer interactive.

## [0.4.0]

### Added

- **Auto command menu on empty line** — emptying a paragraph opens the block menu automatically (web), so you can pick a block without typing `/`. Toggle with the new `autoMenuOnEmpty` prop (default `true`).
- **`colorOverrides` prop** — override individual theme color tokens (slash-menu background, borders, block surfaces, …) without constructing a whole `Theme`; exported `withColors(theme, colors)` helper.
- **More video providers** — `video` blocks now recognize Loom, Dailymotion, Wistia, Streamable, Twitch and YouTube Shorts in addition to YouTube/Vimeo/`.mp4`.

### Fixed

- **Caret on block switch** — re-focusing a block now always restores the requested caret position (previously a cached-selection guard could leave the cursor in the wrong spot when moving between blocks).
- **Menu scrolling** — scrolling *inside* the slash/mention menu no longer dismisses it; only a real page scroll closes it.
- Added generous bottom padding so you can scroll past the last block.

## [0.3.0]

### Added

- **@-mentions** — feed `people` to `<BlockNoteView>`; typing `@` opens a typeahead that inserts a highlighted mention. `MentionUser` type + `renderMention` override.
- **Delete void blocks** — a hover delete button appears on void blocks (media, table, divider, custom void) that previously had no delete affordance; text blocks remain deletable by emptying them.
- **Forward-delete** — pressing **Delete** on an empty line removes the line (`Editor.deleteForward`).
- **Draggable audio seek** — scrub the audio progress bar (drag, not just tap) on web and native.
- **Custom/media markdown export** — `blocksToMarkdown(doc, serializers)` + per-spec `toMarkdown` hooks; media blocks (video/audio/file/bookmark/map/table) and mentions now export meaningfully instead of vanishing.
- Docs: **[TRANSLATING.md](TRANSLATING.md)** (localization guide) and **[EMBEDDING.md](EMBEDDING.md)** (feeding the editor from an external website).

### Changed

- Scrolling the page now **dismisses the open slash/mention menu** instead of letting it drift.

### Removed

- **Comments** — the comment system (`CommentsPanel`, `CommentsContext`, `Editor.addComment`/`getComments`/etc., `enableComments`/`onCommentRequested` props, the `Comment` type, and `initialComments`/`comments` on `toJSON`/`replaceDocument`) has been removed.

## [0.2.0]

### Added

- **Native page tree** mounted as a slide-in drawer in the Expo demo, with the full multi-page workspace (add / rename / delete / move / favorite, page switching).
- **Custom audio player** on native (React controls driving a hidden WebView engine) — no extra native module required.
- **Cover picker** — choose a solid color or paste an image URL, on web and native.
- **Native font switcher** (Sans / Serif / Mono) using RN-valid font families.
- **Tag-driven release tooling**: `scripts/set-version.mjs`, a manual **Release** workflow, and a tag-triggered **Publish** workflow that cuts a GitHub Release.
- More tests: core block ops, transforms, page metadata, comments, history, and a react i18n-catalog guard (38 total).

### Fixed

- Icons no longer render with a stray black fill (also fixed the checkbox "dot").
- Default block placeholders now show real text instead of raw i18n keys when no `t` is supplied.
- Formatting toolbar floats above the keyboard on native, hides when the keyboard closes, and collapses the selection so the OS copy/paste bar clears too.
- Slash menu no longer floats permanently on native; fixed a crash when filtering (`window.addEventListener` on native).
- Map renders OpenStreetMap in a WebView (geocoded in-page), static and theme-aware (light/dark tiles).
- YouTube embeds use the nocookie host + `playsinline` + a mobile UA to avoid the "error 153" player config failure.
- Keyboard no longer hides the block you're typing in; focus is retried on add/rename so it stays up.
- Page tree sized for touch; the 3-dots menu and cover picker stay on-screen.
- CI builds packages before type-checking so `@sebastienaglae/bnn-core` resolves.

## [0.1.0]

- Initial release: platform-agnostic core (`@sebastienaglae/bnn-core`) and cross-platform UI (`@sebastienaglae/bnn-react`) — blocks, inline formatting, slash menu, formatting toolbar, side menu + drag-to-reorder, page header, page tree, comments, custom blocks & inline content, i18n, theming, undo/redo, Markdown & JSON serialization.

[0.3.0]: https://github.com/sebastienaglae/block-note-native/releases/tag/v0.3.0
[0.2.0]: https://github.com/sebastienaglae/block-note-native/releases/tag/v0.2.0
[0.1.0]: https://github.com/sebastienaglae/block-note-native/releases/tag/v0.1.0
