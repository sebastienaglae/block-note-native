# Contributing

Thanks for your interest in **block-note-native**! This is an npm-workspaces monorepo.

## Prerequisites

- Node 18+ and npm 9+ (npm workspaces).
- For the native app: an Android emulator/device or iOS simulator, or just use Expo web.

## Setup

```bash
git clone https://github.com/sebastienaglae/block-note-native.git
cd block-note-native
npm install          # installs every workspace
```

## Layout

| Workspace | Package | What |
|---|---|---|
| `packages/core` | `@sebastienaglae/bnn-core` | Pure-TS engine (model, Editor, transforms, markdown). No UI. |
| `packages/react` | `@sebastienaglae/bnn-react` | Cross-platform UI + custom-component API. |
| `packages/demo-shared` | `@sebastienaglae/bnn-demo-shared` (private) | One set of demo custom components, shared by both apps. |
| `apps/web` | (private) | Vite + react-native-web demo. |
| `apps/native` | (private) | Expo (SDK 54) demo. |

## Day-to-day commands

```bash
npm test                                   # all unit tests (core + react)
npm run typecheck                          # type-check core + react
npm run dev:web                            # Vite web demo  → http://localhost:5173
npm run start -w @sebastienaglae/bnn-demo-shared   # (n/a) — use the app workspaces below
npm run web   -w @bnn/native-demo          # Expo web
npm run android -w @bnn/native-demo        # Expo on Android
npm run build -w @sebastienaglae/bnn-core  # build the packages
npm run build -w @sebastienaglae/bnn-react
```

> **Build before type-checking from a clean clone.** The `react` / `demo-shared` type-checks resolve `@sebastienaglae/bnn-core` through `node_modules → packages/core/dist`, so build the packages first (CI does this automatically).

## Before opening a PR

1. `npm test` is green.
2. `npm run typecheck` is clean.
3. The packages build: `npm run build -w @sebastienaglae/bnn-core && npm run build -w @sebastienaglae/bnn-react`.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs all three on every push/PR.

### Cross-platform notes

- UI is written with React Native primitives from `@sebastienaglae/bnn-react` (`View`, `Text`, `Pressable`, …) so it runs on web via react-native-web. Avoid raw DOM/`window`/`document` unless guarded by `Platform.OS === "web"`.
- The only intentionally platform-split files are `editable/RichTextInput.{tsx,native.tsx}` and the icon/embed files (`*.native.tsx`). Keep both sides of any split in sync.
- New user-facing strings must go through `t(key, fallback)` and be added to `packages/react/src/i18n/labels.ts` (a test enforces slash-item keys exist).

## Releasing

Versioning is **git-tag driven**. The tag is the source of truth.

- **Automated:** run the **Release** workflow (Actions → *Release* → *Run workflow*) with a bump (`patch`/`minor`/`major`) or an explicit version. It bumps every workspace, tests, commits, and pushes a `vX.Y.Z` tag.
- The pushed tag triggers **Publish** ([`.github/workflows/publish.yml`](.github/workflows/publish.yml)), which sets the package versions from the tag, builds, publishes `@sebastienaglae/bnn-core` and `@sebastienaglae/bnn-react` to GitHub Packages, and cuts a GitHub Release.

To cut a release by hand: `node scripts/set-version.mjs vX.Y.Z`, then commit and `git tag vX.Y.Z && git push --follow-tags`.

## License

By contributing you agree your contributions are licensed under the [MIT License](./LICENSE).
