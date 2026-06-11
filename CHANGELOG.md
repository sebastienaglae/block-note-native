# Changelog

All notable changes to `@sebastienaglae/bnn-core` and `@sebastienaglae/bnn-react`.
This project adheres to [Semantic Versioning](https://semver.org/). Releases are cut from git tags (`vX.Y.Z`).

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

[0.2.0]: https://github.com/sebastienaglae/block-note-native/releases/tag/v0.2.0
[0.1.0]: https://github.com/sebastienaglae/block-note-native/releases/tag/v0.1.0
