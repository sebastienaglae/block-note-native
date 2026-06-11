<!-- Thanks for contributing! Keep changes cross-platform (web + React Native). -->

## What & why

<!-- A short description of the change and the motivation. Link any issue: Closes #123 -->

## Checklist

- [ ] `npm test` passes
- [ ] `npm run typecheck` is clean
- [ ] Packages build (`npm run build -w @sebastienaglae/bnn-core && npm run build -w @sebastienaglae/bnn-react`)
- [ ] Works on web **and** React Native (no unguarded DOM / `window` / `document`)
- [ ] New user-facing strings go through `t(key, fallback)` and are added to `labels.ts`
- [ ] Both sides of any platform-split file (`*.native.tsx` / `*.tsx`) kept in sync
