# design-sync notes — prediction-game (client)

This repo is a **Vite application**, not a library/design-system package. The
sync is adapted to that shape; the gotchas below let a future re-sync skip the
debugging.

## Source shape & entry
- No library build, no `.d.ts`, no Storybook → `shape: package` with a
  **hand-authored barrel entry** at `client/ds-bundle-entry.jsx` (set as
  `cfg.entry`). It re-exports the components onto `window.PredictionGameDS` and
  deliberately does NOT import `main.jsx`/`App.jsx` (those call
  `createRoot().render()` at module load and would throw in the preview sandbox).
- Component discovery is driven entirely by `cfg.componentSrcMap` (no `.d.ts` to
  scan). To add/remove a component: edit BOTH the barrel export and
  `componentSrcMap`. They must stay in sync.
- `cfg.provider.component = "PreviewProvider"` (defined in the barrel) wraps every
  card in a `MemoryRouter` so the router-dependent components (Navbar, layouts,
  pages) render. It is a bundle export but not a component card.

## CSS / tokens
- `cfg.cssEntry` points at the **compiled** Tailwind output
  `client/dist/assets/index-Buym27Jc.css` (the source `src/index.css` is just
  `@tailwind` directives and can't be shipped directly).
- ⚠️ Re-sync risk: that filename is content-hashed and `client/dist/` is
  gitignored. On a fresh clone or after a Tailwind change, run `cd client && npm
  run build`, then update `cfg.cssEntry` to the new `dist/assets/index-*.css`
  filename before building the bundle.

## Fonts
- The app loads **Inter** + **Oswald** from Google Fonts via a `<link>` in
  `client/index.html` (runtime CDN). claude.ai/design won't have that link, so the
  fonts are shipped self-contained: the latin-subset woff2 live in
  `.design-sync/fonts/` and are wired via `cfg.extraFonts`. Re-fetch with
  `node .ds-sync/fetch-fonts.mjs` if weights change. Only the **latin** subset is
  shipped (the app is English).

## Renderability (why some components are floor cards)
- Team reference data (flags via `t.icon`, short codes via `t.short_name`) lives
  in the DB and is fetched at runtime by `TeamsContext`. The repo ships **no flag
  assets**, so:
  - `TeamIcon` renders nothing without runtime data → ships the **floor card** by
    design. Not a failure.
  - `TeamLabel` / `TeamName` previews show the team **name as text** (no flag/code).
  - `TeamSelect` / `TeamMultiSelect` previews are driven by `value` props (chips
    and the selected value render from the prop strings directly, no context data
    needed).
- Pages that need route params or a live API (admin dashboards, PlayPage,
  PredictionPage) render the typographic floor card. Pages whose empty/loading
  state is self-contained (Leaderboard, Games, Join, Matches, AdminLogin,
  AdminTeams) render their real chrome as-is — good cards without authoring.

## Known render warns
- `[RENDER_BLANK] TeamLabel` before authoring — resolved by
  `.design-sync/previews/TeamLabel.tsx`.

## Re-sync risks (watch-list)
- `cfg.cssEntry` hashed filename + gitignored `client/dist/` (see CSS section).
- Team-data-driven components (`TeamIcon`, flags/codes) can only be previewed with
  seeded data; today they rely on props/floor cards. If a future sync wants real
  flags, seed a mock `TeamsContext` (would require exporting the context from
  `src/context/TeamsContext.jsx`).
- The barrel + `componentSrcMap` must stay in lockstep when components are
  added/removed/renamed.
