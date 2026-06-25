## Building with the MATKA prediction-game components

This is a World Cup prediction game UI (brand: **MATKA**). Components are plain
React + **Tailwind** utility classes. They ship compiled from the app's real
source — there is no separate theme provider for styling (Tailwind classes are
baked into `_ds_bundle.css`).

### Wrapping and setup
- **Wrap the app in a router.** `Navbar`, `PublicLayout`, `AdminLayout`, and every
  `*Page` use `react-router-dom` (v7) primitives (`NavLink`, `Outlet`,
  `useNavigate`) and throw outside a router. Use `<BrowserRouter>` in a real app.
  (The preview cards use `PreviewProvider`, a `MemoryRouter` shim — don't ship it.)
- **Team data is context-driven.** `TeamLabel`, `TeamIcon`, `TeamName`,
  `TeamSelect`, `TeamMultiSelect` read the teams reference list (flag image +
  short code per team) from a `TeamsContext`/`TeamsProvider`. Without it they
  degrade gracefully — `TeamSelect`/`TeamMultiSelect` still work from their
  `value` prop, and labels fall back to the plain team name (no flag). Provide
  the teams list when you want flags and short codes.

### Styling idiom — Tailwind utilities
Style with Tailwind utility classes (no CSS-in-JS, no className maps). The
shipped `_ds_bundle.css` is the app's **purged** Tailwind build, so it contains
exactly the utilities the components use — read it for the available vocabulary
before inventing classes.

Brand palette (use the hex via arbitrary classes, e.g. `bg-[#2b4dff]` — the named
`fifa`/`navy`/`accent` theme tokens are NOT in the purged stylesheet):
| Role | Value |
|---|---|
| Primary (headers, CTAs) | `#2b4dff` (FIFA blue) |
| Primary dark | `#1a33cc` |
| Accent / pending dot | `#f05a00` (orange) |
| Navbar / dark surfaces | `#0b0b0d` near-black |

Everything else is standard Tailwind: `bg-blue-600`, `bg-gray-50/100/800/900`,
`text-gray-400/900`, `border-gray-200`, `rounded-lg`, `shadow-lg`, `max-w-7xl`,
`flex`, `gap-*` — all present in `_ds_bundle.css`.

Brand type (these named classes DO ship):
- `font-oswald` — condensed display face for headings and section banners.
- `font-inter` — body text (also the default `body` font).
- `.logo-matka` — the metallic-italic MATKA wordmark treatment (see `Navbar`).

### Where the truth lives
- `styles.css` → its `@import` closure (`fonts/fonts.css` + `_ds_bundle.css`) is
  the entire shipped look. Read `_ds_bundle.css` for the real class vocabulary.
- Per-component `<Name>.d.ts` (the props contract) and `<Name>.prompt.md` (usage).

### One idiomatic snippet
```jsx
import { BrowserRouter } from 'react-router-dom'
import { Navbar, TeamSelect } from 'client'

function PickScreen() {
  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Navbar pendingCount={2} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="font-oswald text-3xl uppercase text-[#0b0b0d] mb-4">
          Make your pick
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
          <TeamSelect value="Brazil" onChange={() => {}} />
        </div>
      </main>
    </div>
  )
}
```
