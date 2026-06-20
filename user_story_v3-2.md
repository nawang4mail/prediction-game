# User Stories — v3.2.0: FIFA-Styled UI (client-2)

> **Scope:** A complete UI rebuild in a new `client-2/` folder. Styled after the official FIFA World Cup website. Does not touch the existing `client/`. Backend (port 4000) is unchanged.
>
> Stories continue from US-71 (v3 ended there). Numbers: **US-72 – US-87**.

---

### US-72 · App Shell, Fonts & Sticky Navigation ✅

**As a** participant  
**I want to** see a polished, responsive app shell with a sticky dark navbar  
**So that** navigation feels professional and consistent on any device

**Acceptance Criteria:**
- `client-2/` is a new Vite + React + Tailwind project (does not touch `client/`)
- Google Fonts loaded: `Oswald` (headers/titles) and `Inter` (body/UI text)
- Navbar is sticky at the top; background `bg-gray-900`
- Left: logo / app name in Oswald
- Center: nav links — "My Prediction", "Games", "Leaderboard" (hidden on mobile, shown in hamburger menu)
- Mobile: hamburger icon toggles a full-width dropdown menu
- Active route link is visually highlighted
- App uses React Router v6 for SPA routing — no full-page reloads
- Global color tokens defined in Tailwind config: `navy` (gray-900), `hero-from` (blue-600), `hero-to` (blue-800), `accent` (orange-500)

**Out of Scope:** Admin navbar is a separate layout (US-80).

---

### US-73 · Leaderboard Hero Section & Game Selector ✅

**As a** participant  
**I want to** see a striking hero banner on the leaderboard page with a game selection dropdown  
**So that** I can instantly switch between games and feel the visual energy of the product

**Acceptance Criteria:**
- Hero section sits directly below the navbar on the `/leaderboard` route
- Background: `bg-gradient-to-br from-blue-600 to-blue-800`
- Large uppercase bold title: **"LEADERBOARD"** in Oswald font
- Below the title: a styled dropdown populated from `GET /api/games`
- Dropdown lists all non-draft games (name + status badge)
- Selecting a game updates the leaderboard table below without page reload
- Selected game ID is reflected in URL query param `?game=<id>` so sharing the URL works
- If only one game exists it is auto-selected
- Loading skeleton shown while games list fetches

---

### US-74 · Leaderboard Table with Pinned User Row ✅

**As a** participant  
**I want to** see the full leaderboard for the selected game, with my own best entry pinned at the bottom in orange  
**So that** I can quickly find my rank even when I'm outside the visible scroll area

**Acceptance Criteria:**
- Calls `GET /api/leaderboard` scoped to the selected game
- Table columns: Rank · Name · Points
- Leaderboard rows are scrollable within a fixed-height container (top 20 visible before scroll)
- Device identity determined by `entry_token` values stored in `localStorage` (key `entry_tokens`, array)
- If device has one or more entries in the current game: identify the entry with the best (lowest) rank
- That entry's row is highlighted `bg-orange-500 text-white` and **always rendered sticky at the bottom** of the leaderboard container — even if it already appears in the scrollable list (shows twice: once in position, once pinned)
- If device has no entry in the current game, the sticky row is hidden
- If multiple entries exist (same device, same game), only the best-ranked one pins
- Ties display the same rank number (dense rank, matching backend)
- "No entries yet" empty state shown when leaderboard is empty

---

### US-75 · Games Browse & Filter Page ✅

**As a** participant  
**I want to** browse all available games and filter by type  
**So that** I can find the right game to join or review

**Acceptance Criteria:**
- Route: `/games`
- Calls `GET /api/games` — shows all non-draft games
- Each game displayed as a card: game name, type badge (`Guess Winners` / `Bracket`), status badge (`Open` / `Locked` / `Finished`)
- Filter bar at top: "All" · "Guess Winners" · "Bracket Prediction" tabs/pills
- Cards for `open` games show a **"Join"** button (leads to US-76 join flow)
- Cards for `locked` / `finished` games show a **"View Leaderboard"** button (navigates to `/leaderboard?game=<id>`)
- If device already has an `entry_token` for a game, show **"View My Prediction"** instead of "Join"
- Empty state shown if no games match the active filter

---

### US-76 · Join Game Flow ✅

**As a** participant  
**I want to** join an open game by entering my display name and optional phone number  
**So that** I can get an entry in the game and receive a pending-approval notification

**Acceptance Criteria:**
- Triggered from the "Join" button on the Games page (US-75)
- Modal or dedicated page at `/games/:id/join`
- Form fields: Display Name (required, max 50 chars), Phone (optional)
- On submit: calls `POST /api/participants` with `{ game_id, display_name, phone }`
- On success: `entry_token` from response is saved to `localStorage` (appended to `entry_tokens` array)
- User is shown a **pending approval** message (status defaults to `declined` until admin approves)
- Message: "Your entry is pending approval. You'll be able to make predictions once approved."
- "View Leaderboard" CTA shown below the message
- On API error (e.g. name already taken): inline validation error displayed on the form
- After all predictions are made, "Finish Entry" button calls `POST /api/participants/me/finish` to confirm submission

---

### US-77 · My Prediction Page — Guess Winners ✅

**As a** participant  
**I want to** view and make predictions for a Guess Winners game  
**So that** I can pick match outcomes and track my results

**Acceptance Criteria:**
- Route: `/prediction?game=<id>`
- Calls `GET /api/participants/me` to fetch participant data and saved predictions
- If no entry found for this device/game: show "You haven't joined this game yet" with a Join CTA
- If entry status is `declined` (pending): show approval-pending banner; predictions are read-only
- Match cards displayed in a list:
  - Three selectable options: Team A · DRAW · Team B
  - Selected option highlighted in blue
  - If game is `open` and participant is `approved`: clicking saves via `PUT /api/participants/me/predictions`
  - If game is `locked` or `finished`: read-only; correct result highlighted green, wrong picks highlighted red
- Optimistic UI: selection updates immediately, API call fires in background; error reverts selection
- "Finish Entry" button calls `POST /api/participants/me/finish` when all predictions are made (open + approved only)

---

### US-78 · My Prediction Page — Bracket Prediction ✅

**As a** participant  
**I want to** view and make bracket picks for a Bracket Prediction game  
**So that** I can select which teams advance through each stage

**Acceptance Criteria:**
- Same route as US-77 (`/prediction?game=<id>`), UI adapts based on `game.type === 'bracket_prediction'`
- Calls `GET /api/participants/me` — returns stages with team lists and existing selections
- Stages rendered as cards stacked vertically, each showing:
  - Stage name and description
  - Grid of team buttons (all teams in the stage)
  - Prompt showing `pick_count` (e.g. "Pick 4 teams")
  - Selected teams highlighted in blue; selecting beyond `pick_count` replaces the oldest selection
- Saves via `PUT /api/participants/me/bracket` on each pick change
- If game is `locked` or `finished`: read-only; `is_winner` teams highlighted green, wrong picks red
- "Finish Entry" button available when all stages have exactly `pick_count` picks (open + approved only)

---

### US-79 · Entry Status Awareness & Multi-Game Identity ✅

**As a** participant  
**I want to** see my approval status clearly and have my device remember all my entries  
**So that** I don't have to re-enter my details and I always know where I stand

**Acceptance Criteria:**
- On app load: `entry_tokens` array is read from `localStorage`
- Calls `POST /api/participants/statuses` with all stored tokens to get current statuses
- Navbar "My Prediction" link shows a badge/dot if any entry is pending approval
- If an entry is declined with a `status_message`: that message is shown inside the pending banner
- Participant can delete an incomplete entry (no picks saved) via `DELETE /api/participants/me`; corresponding token is removed from `localStorage`

---

### US-80 · Admin Authentication ✅

**As an** admin  
**I want to** log in to a protected admin panel within the same app  
**So that** I can manage games, users, and results without switching applications

**Acceptance Criteria:**
- Route: `/admin/login`
- Username + password form; calls `POST /api/admin/auth/login`
- On success: JWT stored in `localStorage` (key `admin_token`)
- All `/admin/*` routes redirect to `/admin/login` if `admin_token` is absent or expired
- On logout: `admin_token` cleared, redirect to `/admin/login`
- Admin routes use a separate layout (sidebar nav, no public navbar)

---

### US-81 · Admin Dashboard ✅

**As an** admin  
**I want to** see a summary of the current game's activity at a glance  
**So that** I can monitor participation and progress

**Acceptance Criteria:**
- Route: `/admin/dashboard`
- Calls `GET /api/admin/dashboard`
- Stat cards: Total Participants · Matches/Stages · Predictions Saved · Max Possible Points
- Top 5 leaderboard mini-table
- Game status badge with a "Change Status" button (triggers confirmation modal for status transition)
- Game selector in admin sidebar or header to switch between games

---

### US-82 · Admin Game Management ✅

**As an** admin  
**I want to** create, configure, and lifecycle-manage games  
**So that** I can run multiple prediction events

**Acceptance Criteria:**
- Route: `/admin/games`
- Lists all games (`GET /api/admin/games`): name, type, status
- "Create Game" button: form with name + type → `POST /api/admin/games`
- Status transition button per game: draft → open → locked → finished (`PUT /api/admin/games/:id/status`)
- Delete button for draft/finished games (`DELETE /api/admin/games/:id`); bulk delete via checkboxes (`POST /api/admin/games/bulk-delete`)
- Type can only be changed while game is `draft` (`PUT /api/admin/games/:id/type`)
- Confirmation dialog before destructive actions (delete, transition to locked/finished)

---

### US-83 · Admin Match Management (Guess Winners) ✅

**As an** admin  
**I want to** add, edit, and score matches for a Guess Winners game  
**So that** participants can predict outcomes and earn points

**Acceptance Criteria:**
- Route: `/admin/matches` (scoped to selected game)
- Lists all matches (`GET /api/admin/matches`): teams, label, date, result
- "Add Match" form: team_a, team_b, label (optional), match_date (optional) → `POST /api/admin/matches`
- Edit and delete per row (editable only while game is `draft` or `open`)
- "Set Result" action per match: choose team_a / draw / team_b → `PUT /api/admin/matches/:id/result` (allowed while `open` or `locked`)
- Backend triggers leaderboard recalculation on result set

---

### US-84 · Admin Bracket Management ✅

**As an** admin  
**I want to** create stages and mark winners for a Bracket Prediction game  
**So that** participants' picks can be scored

**Acceptance Criteria:**
- Route: `/admin/bracket` (scoped to selected game)
- Lists all stages (`GET /api/admin/bracket`): name, team count, pick_count, points config
- "Add Stage" form: name, description, teams (comma-separated), pick_count, points_per_correct, all_correct_bonus → `POST /api/admin/bracket`
- Edit and delete per stage (editable only while `draft` or `open`)
- "Set Results" per stage: checkboxes per team to mark as `is_winner` → `PUT /api/admin/bracket/:id/results`
- "View Entries" tab shows all participants' bracket picks (`GET /api/admin/bracket/entries`) in a read-only grid

---

### US-85 · Admin User Management ✅

**As an** admin  
**I want to** view, approve, decline, add, and bulk-import participants  
**So that** I control who is scored on the leaderboard

**Acceptance Criteria:**
- Route: `/admin/users` (scoped to selected game)
- Lists all participants (`GET /api/admin/users`): name, phone, status, status_message, created_at
- Filter by status: All / Approved / Pending
- "Approve" / "Decline" actions per row → `PUT /api/admin/users/:id/status`; decline can include a custom message
- "Add User" form: display_name + optional phone → `POST /api/admin/users`
- "Bulk Add" textarea: one name per line → `POST /api/admin/users/bulk`
- "Bulk Add with Predictions" textarea: `Name pick1 pick2 …` format → `POST /api/admin/users/bulk-with-predictions`
- Edit name/phone inline → `PUT /api/admin/users/:id`
- Delete user (with confirmation dialog) → `DELETE /api/admin/users/:id`; leaderboard is recalculated by backend

---

### US-86 · Admin Settings & Prize Tiers ✅

**As an** admin  
**I want to** configure game settings and prize distribution  
**So that** participants see accurate rules and prize information

**Acceptance Criteria:**
- Route: `/admin/settings` (scoped to selected game)
- Form fields: Prize Text, Rules Text, Finish Message, Entry Cost, Commission % → `PUT /api/admin/settings`
- Prize Tiers section: add/edit/delete tiers (label + percentage) → `PUT /api/admin/prize-tiers`
- Running total indicator; warning shown if tiers do not sum to 100%
- Editable while game is `draft`, `open`, or `locked`

---

### US-87 · Admin Prediction Grid (Guess Winners) ✅

**As an** admin  
**I want to** view all approved participants' predictions in a grid  
**So that** I can spot-check entries and manually correct predictions if needed

**Acceptance Criteria:**
- Route: `/admin/predictions` (scoped to selected Guess Winners game)
- Grid: rows = approved participants, columns = matches → `GET /api/admin/predictions`
- Each cell shows prediction (A / D / B) colour-coded: green = correct, red = wrong, grey = no result yet
- Admin can click a cell to set/change a prediction → `POST /api/admin/predictions`
- Admin can clear a cell → `DELETE /api/admin/predictions/:userId/:matchId`
- Grid is read-only once game is `locked` (per backend rule US-63)

---

### US-88 · My Prediction — Games Entry List ✅

**As a** participant
**I want to** see a list of all games I have entries in when I open "My Prediction" without a specific game selected
**So that** I can quickly pick which game's predictions to view

**Acceptance Criteria:**
- Route: `/prediction` (no `?game=` param)
- Reads entries from `localStorage` via `getEntries()`
- Fetches `GET /api/games` to get game metadata (name, type, status)
- Filters to games where `entriesForGame(game.id).length > 0`
- Shows a card grid: game name, type badge, status badge, entry count, "View Predictions" button → navigates to `/prediction?game=<id>`
- If no entries anywhere: empty state with "Browse Games" link
- Loading skeleton while games list fetches
- Back link on the prediction detail view returns to this game list (`/prediction`)

---

### US-89 · Games Page — Dual-Action Buttons + Re-join After Rejection ✅

**As a** participant
**I want to** see "Join Game" and "View My Prediction" as independent buttons on each game card
**So that** I can add a new entry even after a previous one was rejected by the admin

**Acceptance Criteria:**
- Open game: always shows "Join Game" (blue) — visible even if device already has an entry
- Has any entry for this game: always shows "View My Prediction" (orange)
- Open game with existing entry: both buttons shown simultaneously (stacked)
- Locked/finished with entry: shows "View My Prediction" (orange)
- Locked/finished without entry: shows "View Leaderboard" (gray)
- Clicking "Join Game" opens the join form (`/games/:id/join`) which creates a new entry
- client-2 only; no backend changes

---

### US-90 · FIFA-Style 4-Tab Navigation & Color Theme ✅

**As a** participant
**I want to** see a redesigned navbar with 4 tabs matching the FIFA-style sample design
**So that** navigation is clear, visually on-brand, and covers all key sections

**Acceptance Criteria:**
- Navbar background: `#0b0b0d` (FIFA black) — updated from `bg-gray-900`
- Logo (🏆 BRACKET) and nav links are left-aligned together
- 4 nav links: **MY GAME · LEAGUES · LEADERBOARD · MATCHES** (uppercase, tracking-wide)
- Active link: white text + white bottom border (`border-b-4 border-white`) — replaces orange underline
- Right side: user profile icon (SVG person circle)
- Mobile hamburger shows all 4 links in dropdown
- Tailwind config adds FIFA color tokens: `fifa.blue` (#2b4dff), `fifa.orange` (#f05a00), `fifa.black` (#0b0b0d)
- Routes updated: `/prediction` → `/my-game`, `/games` → `/leagues`, `/games/:id/join` → `/leagues/:id/join`
- Backward-compat redirects keep old URLs working
- All internal `<Link>` references across pages updated to new routes

---

### US-91 · Leaderboard Visual Upgrade ✅

**As a** participant
**I want to** see a richer leaderboard with avatar initials, medal icons, and a card-overlap layout
**So that** the standings feel premium and match the FIFA-style sample

**Acceptance Criteria:**
- Max width updated to `max-w-7xl` across public pages
- Main content card pulls up over hero: `-mt-8 relative z-20` overlap
- Hero gradient: `linear-gradient(135deg, #2b4dff 0%, #1a33cc 100%)` with decorative ellipse
- Game selector shows "Game" label above the `<select>` (two-line styled card format)
- Leaderboard rows show avatar: colored initials circle (stable color from first char of name)
- Top 3 rows: medal emojis (🥇/🥈/🥉) instead of rank numbers
- Vertical border divider between rank and name columns
- Sticky bottom bar uses `#f05a00` (FIFA orange)

---

### US-92 · Matches Page ✅

**As a** participant
**I want to** see all matches for the selected game with community pick percentages
**So that** I can understand how the crowd is predicting each fixture

**Acceptance Criteria:**
- New route: `/matches`
- Fetches `GET /api/matches?game_id=<id>` for match list
- Blue gradient hero ("MATCHES" title) + labeled "Game" selector dropdown
- Content card pulls up over hero (-mt-8), consistent with leaderboard layout
- Match cards: date/label, Team A vs Team B, 3-segment pick percentage bar
- Pick bar colours: FIFA blue (team A) / gray (draw) / lighter blue (team B)
- If match has a result, winning segment highlighted green
- Empty state if no matches; loading skeletons
- Degrades gracefully if `pick_pct` data not returned by API (shows 0% bars)

---

### US-93 · My Game — Accordion List with Type Filter ✅

**As a** participant
**I want to** see my entered games as an expandable list with a type filter
**So that** I can quickly find and review my picks without navigating away

**Acceptance Criteria:**
- `/my-game` (no `?game=` param): shows full-width accordion list of games the device has entries in
- Type filter dropdown above the list: All / Guess Winners / Bracket
- Each row: full width, game name + type badge + status badge on left, chevron on right
- No "View Predictions" button — tapping/clicking a row toggles it open/closed
- When opened: fetches participant data and renders picks inline (GuessWinners or Bracket)
- Lazy fetch: only loads data when the row is first expanded
- Only one row can be open at a time (opening one collapses any other open row)
- Pending/declined state renders the pending banner inline in the expanded row
- Empty state if no entries anywhere; loading skeleton during games fetch
- client-2 only; no backend changes

---

### US-94 · Leagues — Show Player Count Per Game

**As a** participant
**I want to** see how many players have joined each game on the Leagues page
**So that** I can gauge activity before deciding to join

**Acceptance Criteria:**
- Each game card on `/leagues` shows a player count (e.g. "👥 3 players")
- Count reflects approved participants only
- `GET /api/games` response includes `participant_count` (integer) per game
- Backend: `gameModel.findAll()` LEFT JOINs `users` filtered to `status = 'approved'`
- Frontend: count displayed alongside the game type badge on each card
- Shows "0 players" if no approved participants
- Singular "1 player", plural "N players"

---

### US-95 · Leagues — Tap Game to View Rules & Join

**As a** participant
**I want to** tap a game card to read its rules before joining
**So that** I understand the game before committing

**Acceptance Criteria:**
- Tapping/clicking a game card on `/leagues` expands it in place (accordion)
- Only one card open at a time; opening a new one collapses the previous
- Expanded area shows a "Rules" section fetched lazily from `GET /api/settings?game_id=<id>`
- Shows loading skeleton while rules fetch, "No rules set" if empty
- Bottom of expanded area: "Join Game" button (blue, only if status=open) OR "View Leaderboard" (blue, if locked/finished), plus "Cancel" button (gray) to collapse
- "View My Prediction" button removed from all game cards
- Changing the type filter collapses any open card
- client-2 only; no backend changes

---

### US-96 · Leagues — Card Redesign with Rules Modal

**As a** participant
**I want to** see a Join Game button on every card and read the rules in a popup before joining
**So that** the action is always one tap away and I can make an informed decision

**Acceptance Criteria:**
- Each game card always shows a "Join Game" button (clicking it navigates directly to `/leagues/:id/join`)
- Clicking anywhere else on the card opens a modal sheet with the game's rules
- Modal: FIFA blue gradient header with game name, status badge, type badge, player count
- Modal body: rules text fetched from `GET /api/settings?game_id=<id>` with skeleton loader
- Modal footer: "Join Game" button (blue) + "Cancel" button (gray)
- Modal closes on Cancel, backdrop click, or Escape key
- On mobile the modal slides up from the bottom (sheet style); on sm+ it is centered
- Body scroll locked while modal is open
- client-2 only; no backend changes

---

### US-97 · Leaderboard — Tap Player to View Picks

**As a** visitor
**I want to** tap a player on the leaderboard to see their predictions
**So that** I can compare picks and follow how each player is doing

**Acceptance Criteria:**
- Every leaderboard row is tappable (cursor-pointer, blue hover highlight)
- Tapping opens a modal with the player's avatar, name, rank and points in the header
- Modal body shows all picks for that game:
  - Guess Winners: match cards read-only (pick highlighted blue; correct=green, wrong=red when result set)
  - Bracket: stage cards read-only (selected teams highlighted blue; winners green, wrong red when revealed)
  - "No picks recorded yet" if player has no picks
- Backend: new public `GET /api/participants/:id/picks?game_id=<id>` endpoint
  - Returns 404 if participant not found, not in that game, or not approved
  - Returns `{ participant, game: { type, status }, matches | stages }` depending on game type
- Modal closes on Close button, backdrop click, or Escape
- Changing the game selector closes any open modal
- client-2 + server; no DB schema changes (query only)

---

### US-99 · Pick-Before-Save Join Flow

**As a** player joining a game
**I want to** make all my picks and then explicitly submit
**So that** my entry is only saved when I'm ready — cancelling or closing the app saves nothing

**Acceptance Criteria:**
- Join form (`/leagues/:id/join`) only collects display name + phone; it no longer
  creates a database entry. "Continue to Picks →" navigates to the pick page.
- New pick page `/leagues/:id/play` shows the pick UI based on game type:
  - Guess Winners: a card per match with team_a / DRAW / team_b options
  - Bracket: a card per stage with selectable teams (up to pick_count each)
- Picks are held in local state only — nothing is sent to the server while picking.
- Two buttons in a sticky bar: **Submit Entry** and **Cancel**
  - Submit is disabled until every match is picked / every stage has exactly pick_count
  - Submit calls `POST /api/participants/complete` which creates the entry AND all
    picks in a single transaction, then routes to `/my-game?game=<id>`
  - Cancel returns to Leagues and saves nothing
- Closing the app before submitting saves nothing (no entry is created until Submit)
- If the player reaches `/play` without going through the form (e.g. refresh), they
  are redirected back to the join form
- Backend `POST /api/participants/complete`:
  - 403 if the game is not open; 400 if name missing or picks incomplete/invalid
  - Bracket combined stages validated against teams advanced from parent picks
  - Atomic: a failed/incomplete submit leaves no row in the database

---

### US-100 · Admin Prediction Grid — Full Labels & Read-Only

**As an** admin
**I want to** see each player's exact pick (team name or "Draw") in a read-only grid
**So that** I can review entries clearly without risk of changing them

**Acceptance Criteria:**
- Grid cells show the exact option picked: the team's name for team_a/team_b,
  or "Draw" — no more A/D/B abbreviations
- Column headers and the result row also show full team names / "Draw"
- The grid is fully read-only: admins can no longer click cells to set, change,
  or clear a player's prediction (edit controls removed)
- Colour coding retained: green = correct, red = wrong, blue = no result yet,
  grey dot = no pick
- Header shows a "Read-only" indicator

---

### US-101 · Prediction Grid — Coloured Cells & Score Column

**As an** admin
**I want to** see coloured cells and a score per player in the prediction grid
**So that** I can scan results at a glance and see who's leading

**Acceptance Criteria:**
- Each pick is shown as a coloured cell (background), not just coloured text:
  - green = correct, red = wrong, blue = picked but no result yet, white = no pick
- A "Score" column is pinned at the right end showing each player's points
- Score = 1 point per correct pick (matches the leaderboard calculation)
- Legend updated to show colour swatches and the scoring rule

---

### US-102 · Multi-Entry Selector & Leagues Has-Entry Actions

**As a** player with more than one entry in a game
**I want to** choose which entry to view, and clear actions on Leagues for games I've joined
**So that** I can manage multiple entries without confusion

**Acceptance Criteria:**
- MY GAME: when a game has multiple entries on this device, a "Viewing Entry"
  dropdown lists each entry by name (pending entries marked "(pending)")
  - Shown in both the accordion row and the single-game detail view
  - Selecting an entry loads that specific entry's picks (and edits save to it)
- API: a caller may set `x-entry-token` explicitly to target a specific entry;
  the interceptor only auto-fills the token when not provided
- LEAGUES: when this device already has an entry for a game, the card and modal
  show "Add Another Entry" (open games only) and "Edit Entry" / "View Entry"
  instead of a single "Join Game" button
  - "Add Another Entry" → name form → picks → submit (a second entry)
  - "Edit Entry" (open) / "View Entry" (locked/finished) → opens that game in My Game
- Games with no existing entry are unchanged ("Join Game" / disabled when not open)

---

### US-103 · Add-Entry Chooser & Prune Deleted Entries

**As a** player adding another entry
**I want to** say whether the entry is for myself or someone else
**So that** my own extra entries are named automatically and others get their own details

**Acceptance Criteria:**
- On Leagues, "Add Entry" / "Add Another Entry" opens a chooser: "Who is this entry for?"
  - **Myself** → skips the name form; uses the base name + " #2", " #3", … (next
    available number derived from this device's existing entries) and goes straight
    to the picks page
  - **Someone else** → opens the name form to enter a fresh display name + phone
- The auto-numbered name is shown as a preview on the "Myself" option
- Entry "is_self" flag is stored accordingly (false for someone-else entries)

**As a** player whose entry was deleted by an admin
**I want to** stop seeing that entry on my device
**So that** My Game shows an accurate list**

**Acceptance Criteria:**
- `refreshStatuses` prunes any local entry whose token the server no longer
  recognises (deleted server-side), in addition to refreshing statuses
- My Game reconciles on mount and re-renders, so stale/deleted entries disappear
  and entry counts are correct

---

### US-104 · Read-Only My Game with Edit Toggle & Submit Confirmation

**As a** player viewing my entry in My Game
**I want to** see my picks locked by default and edit only after pressing Edit
**So that** I don't change picks by accident

**Acceptance Criteria:**
- In My Game (accordion and detail view) picks are read-only by default, even when
  the game is open
- An "✎ Edit Entry" button appears for open games; pressing it enables editing and
  the button becomes "✓ Confirm Changes"
- Pressing "Confirm Changes" returns the picks to read-only (changes save as they
  are made)
- Locked/finished games show no edit button (always read-only)
- The old "Confirm & Finish Entry" button is removed in favour of this toggle

**As a** player who just submitted an entry from Leagues (Join or Add Entry)
**I want to** see a confirmation, then land on the leaderboard
**So that** I know my entry was saved and can see standings

**Acceptance Criteria:**
- After submitting picks on the play page, a confirmation modal appears
  ("Entry Submitted!") with the player/game name
- It then goes to the leaderboard for that game (auto-redirect after a short pause,
  or immediately via the "View Leaderboard" button) — no longer to My Game

---

### US-105 · Leaderboard Defaults to Open Game & Community Pick Bars

**As a** visitor clicking the logo
**I want to** land on the latest open game's leaderboard
**So that** I see an active game instead of an empty/old one

**Acceptance Criteria:**
- Leaderboard auto-selects the latest **open** game (newest-first), falling back to
  the most recent game only if none are open
- Matches page uses the same default for consistency

**As a** visitor on the Matches page
**I want to** see each option's share of community picks as a coloured bar
**So that** I can read the crowd's prediction at a glance

**Acceptance Criteria:**
- Each match's bar is split into three colour-coded segments sized by the share of
  picks: team A (blue), Draw (gray), team B (orange)
- Percentages are computed from the API's team_a_count / draw_count / team_b_count
- Labels under the bar show each option's % in its segment colour, plus the total
  pick count
- When a result is set, the winning option's segment turns green
- "No community picks yet" shown when a match has zero picks

---

### US-106 · Social Share Preview Banner (Open Graph / Twitter Card)

**As a** participant sharing the app link in a chat or social post
**I want to** see the app's banner image and a title/description in the link preview
**So that** the shared link looks polished and people know what it is before clicking

**Acceptance Criteria:**
- When the app URL is pasted into Facebook, Twitter/X, LinkedIn, Slack, iMessage,
  WhatsApp, etc., the unfurled preview shows the banner image plus title + description
- Open Graph meta tags added to `client-2/index.html`:
  `og:title`, `og:description`, `og:type` (website), `og:site_name`, `og:image`,
  `og:image:width` (1100), `og:image:height` (614)
- URLs are relative and `og:url` is omitted, so the preview's title/link line and
  image resolve against whatever link the user pasted — no hardcoded domain, works
  on any deploy
- Twitter Card meta tags added: `twitter:card` (`summary_large_image`),
  `twitter:title`, `twitter:description`, `twitter:image`
- The banner image is served from a stable, crawler-readable path (`/banner.jpg` in
  `client-2/public/`) — not a hashed bundle path, since crawlers do not execute JS
- A `<meta name="description">` is present for SEO/non-OG consumers
- Image source is `src/assets/banner.jpg` (1100×614)
- client-2 only; no backend changes

---

### US-107 · Admin — Jump to Tab by Type, Edit Stages & Combined Stages

**As an** admin on the Games tab
**I want to** click a game's name to jump straight to its picks tab
**So that** I land on the right editor without manually switching game + tab

**Acceptance Criteria:**
- Clicking a game's **name** on `/admin/games` selects that game (scopes the admin
  panel to it) and navigates to:
  - `/admin/bracket` when `type === 'bracket_prediction'`
  - `/admin/matches` when `type === 'guess_winners'`
- The name is visibly interactive (link styling / hover)

**As an** admin managing a Bracket game
**I want to** edit a stage after it's created
**So that** I can fix names, teams, pick counts, points, and bonuses without deleting

**Acceptance Criteria:**
- Each stage card has an **Edit** action (shown while the game is `draft`/`open`)
- Edit opens the stage form pre-filled; saving calls `PUT /api/admin/bracket/:id`
- The add/edit form is shared (one form, "Add" vs "Edit" mode)
- Fix: Set Results sends `team_ids` (was `winner_ids`, so results never saved)
- Fix: Entries tab reads the API's `stages`/`name` shape (was `picks`/`stage_name`)

**As an** admin
**I want to** build a combined stage from earlier stages
**So that** e.g. Stage C = the union of A and B, and each player only re-picks from
the teams they advanced in A and B

**Acceptance Criteria:**
- The stage form offers "Combine from earlier stages" — a multi-select of existing
  stages; selecting any makes it a combined stage (`parent_ids`)
- A combined stage hides the teams input (teams are inherited; backend derives them
  via `recomputeDerived`)
- Stage cards show a "🔗 Combined from A + B" label for combined stages
- Player picks pages honour combined stages (chain-aware): a combined stage only
  offers the teams the player advanced in its parents; a hint is shown until the
  parent picks are made
- Applies to both the join/play flow (`/leagues/:id/play`) and My Game
- client-2 only; backend already supports edit + `parent_ids` (US-52)

---

### US-108 · Bracket Join — One-Stage-at-a-Time Wizard

**As a** player joining a Bracket game
**I want to** make my picks one stage at a time with Back/Next and a progress bar
**So that** the flow is focused and I clearly see how far through I am

**Acceptance Criteria:**
- On the play page (`/leagues/:id/play`) for a Bracket game, only the current
  stage is shown (not all stages stacked)
- A progress bar at the top has one segment per stage: green when complete, blue
  for the current stage, gray otherwise; a "Stage X of N" caption is shown
- Each stage has **← Back** (disabled on the first stage) and **Next →** at the end
- Next is disabled until the current stage has exactly its `pick_count` valid picks
  — so a combined stage's parents are always completed before it is reached
- A combined stage (C = A + B) still shows only the teams the player advanced in
  its parents (US-107)
- The sticky **Submit Entry** button activates only when every stage is complete
- Progress-bar segments are clickable to jump to a stage
- client-2 only; no backend changes

---

### US-109 · My Game (Bracket) — Picks-Only View + Edit Wizard

**As a** player viewing my Bracket entry in My Game
**I want to** see only the teams I picked, and edit them in a one-stage-at-a-time
wizard with my current picks pre-selected
**So that** my entry is easy to read and changing it feels like the join flow

**Acceptance Criteria:**
- Read-only by default: each stage shows **only the teams the player picked**
  (not the whole team pool), with result colours once the bracket is scored
- An **✎ Edit Entry** button appears for open games
- Edit opens a wizard: one stage at a time, progress bar, Back/Next, with the
  player's **saved picks pre-selected** and the full pool available to change
- Changes are held locally and written on **Submit Changes** (saves every stage,
  in order, via `PUT /participants/me/bracket`); Cancel discards and restores
- Combined stages still honour chain-aware availability (US-107)
- Fix (pre-existing): saved picks never pre-selected because the client read a
  non-existent `stage.selections`; they live in the top-level `selections`
  array (`{ stage_id, stage_team_id }`) and are now grouped by stage
- client-2 only; no backend changes

---

### US-110 · Matches Tab — Bracket Stages & Community Picks (Visitor)

**As a** visitor on the Matches tab viewing a Bracket game
**I want to** see each stage with its teams and how many players picked each
**So that** I can read the crowd's bracket predictions at a glance

**Acceptance Criteria:**
- When the selected game is a Bracket game, the Matches tab shows the game's
  stages (instead of fixtures), each with its teams listed below it
- Teams are laid out as **columns in a horizontally-scrollable row** (scroll
  left/right to see more teams)
- Each team column shows its **number of community picks**
- Teams are ordered **highest picks → lowest** within each stage
- The actual qualifying/winning teams are **highlighted green** once results are set
- Header reads "Stages & Community Picks"; empty state if no stages
- Guess-winners games are unchanged (still show match fixtures + pick bars)
- Data comes from the public `GET /bracket` breakdown (picks + is_winner, already
  sorted by picks DESC); client-2 only, no backend changes

---

### US-111 · Leaderboard Player Picks — Bracket Point Breakdown

**As a** visitor clicking a player on a Bracket leaderboard
**I want to** see only that player's picks with the points each earned
**So that** it's transparent how their total was calculated

**Acceptance Criteria:**
- The expanded player panel shows **only the player's picked teams** per stage
  (not the full team pool)
- Once results are revealed (game finished): each **correct pick shows `+N`**
  (the stage's points_per_correct) and is green; wrong picks are red
- A stage where **all picks are correct shows its `+bonus`** (all_correct_bonus)
- Each stage shows a subtotal ("Stage: X pt") and the panel shows a **grand
  total** that matches the leaderboard
- Before results are in, picks show in blue with no points
- Uses the existing `GET /participants/:id/picks` (returns points_per_correct,
  all_correct_bonus, is_winner, selected); client-2 only, no backend changes

---

### US-112 · Leaderboard Player Picks — Simpler Score Layout

**As a** visitor reading a player's bracket picks
**I want to** a clean, at-a-glance layout of how points were earned
**So that** the scoring is obvious without a busy breakdown

**Acceptance Criteria:**
- Correct picks keep a green team chip; the `+points` is shown **outside** the
  team chip (beside it, in green) — not inside the green background
- A fully-correct stage shows its `+bonus` **beside the stage name** (not in a
  footer)
- The verbose per-stage math line ("N correct × P = … · Stage: X pt") is removed
- The grand total bar remains
- client-2 only; no backend changes (refines US-111)
