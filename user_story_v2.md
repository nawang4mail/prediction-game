# World Cup Prediction Game — v2 User Stories

## Context

v1.0.0 shipped US-01 to US-25 (see `user story.md`): a single admin-managed game with a public leaderboard. v2 adds two themes:

1. **Multi-game support** — the admin can create a new game while every previous game's matches, users, predictions, and results are preserved as browsable history.
2. **Self-service participation without login** — visitors join the active game by entering a display name and submit their own predictions; no account or password.

Numbering continues from v1: new stories start at **US-26**.

**SemVer note:** these stories require a schema migration (`game_id` on existing tables), a breaking change — the target release is **v2.0.0**.

---

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Anyone who opens the app — no login required |
| **Participant** | A visitor who has joined the active game by entering their name — still no login |
| **Admin** | Single privileged user who manages everything via a protected panel |

---

## Epic 8 — Game Management (Admin)

### US-26 · Create a New Game ✅
**As an** admin,
**I want to** create a new game with its own name (e.g. "World Cup 2026"),
**So that** I can run a fresh prediction round without losing any previous game's history.

**Acceptance Criteria:**
- Form field: Game name (required, unique)
- A new game starts empty: no matches, no participants, no predictions
- Creating a game never deletes or alters any previous game's matches, users, predictions, results, or final leaderboard
- The new game appears in the admin game list with its status

---

### US-27 · Game Lifecycle ✅
**As an** admin,
**I want to** move a game through the statuses `open → locked → finished`,
**So that** joining and predicting only happen before kickoff, and completed games become archived history.

**Acceptance Criteria:**
- Status meanings: `open` = participants can join and edit picks; `locked` = game started, picks frozen; `finished` = archived, read-only history
- At most one game is active (`open` or `locked`) at a time; a new game cannot be opened while another is still active
- Admin can transition status from the game list; transitions are confirmed before applying
- Admin pages (dashboard, matches, users, predictions) operate on a selected game, defaulting to the active one
- Setting a game to `finished` freezes its leaderboard as the final standings

---

### US-28 · Preserve v1 Data as the First Game ✅
**As the** system,
**I want** all existing v1 matches, users, predictions, and prize/rules content attached to an auto-created first game during migration,
**So that** the current game's history survives the multi-game schema change.

**Acceptance Criteria:**
- Migration creates one game (e.g. "Game 1") and assigns all existing matches, users, predictions, and settings to it
- Leaderboard, predictions, and results for the existing data look identical before and after the migration
- Migration file documents its rollback SQL
- No data loss: row counts for matches, users, and predictions are unchanged by the migration

---

## Epic 9 — Self-Service Participation (No Login)

### US-29 · Join the Active Game Without Login ✅
**As a** visitor,
**I want to** join the active game by entering my display name (and optionally my phone number),
**So that** I can play without creating an account or password.

**Acceptance Criteria:**
- Public "Join Game" page reachable from the leaderboard while the active game is `open`
- Form fields: Display Name (required), Phone (optional)
- Duplicate display names are auto-suffixed exactly as in US-25 (e.g. "Name 2")
- Joining is rejected with a clear message when no game is `open`
- After joining, the participant lands on their prediction entry view and appears on the leaderboard with 0 points

---

### US-30 · Make and Edit My Own Predictions ✅
**As a** participant,
**I want to** pick Team A / Team B / Draw for each match and change my picks while the game is open,
**So that** I control my own predictions instead of sending them to the admin.

**Acceptance Criteria:**
- After joining, the participant sees all matches of the active game with pick controls (Team A wins / Team B wins / Draw, matching the 1/2/3 convention from US-23)
- The device remembers the participant (token stored in localStorage) so returning to the site resumes their session without re-joining
- A participant can view and edit only their own predictions
- Picks save per match without a full page reload and are reflected in the leaderboard's prediction detail panel
- Matches without a pick simply count as no prediction (consistent with v1 behavior)

---

### US-31 · Predictions Lock at Game Start ✅
**As the** system,
**I want** joining and prediction editing disabled the moment the admin sets the game to `locked`,
**So that** nobody can change picks after the tournament starts.

**Acceptance Criteria:**
- When the game is `locked`, the join page and all participant pick controls become read-only with a clear "game has started" message
- API rejects participant join/prediction writes for a non-`open` game (server-side enforcement, not just UI)
- The admin can still correct any participant's predictions via the predictions grid (US-15) while the game is `locked`
- Locking does not alter any existing picks

---

## Epic 10 — Public Game Views

### US-32 · Browse Past Games ✅
**As a** visitor,
**I want to** switch the leaderboard between the active game and finished games,
**So that** I can revisit past tournaments' standings and predictions.

**Acceptance Criteria:**
- Game selector on the leaderboard listing the active game (default) and all `finished` games
- A finished game shows its final leaderboard and per-player prediction details, read-only
- Prize & rules content shown matches the selected game
- Works on mobile within the existing responsive layout (US-04)

---

### US-33 · Match List with Prediction Breakdown ✅
**As a** visitor,
**I want to** open a Matches tab on the homepage and click a match to see how many participants picked each option,
**So that** I can see the crowd's predictions per match (e.g. USA vs Paraguay: 10 picked USA, 5 picked Paraguay, 3 picked Draw).

**Acceptance Criteria:**
- A "Matches" tab on the homepage lists all matches of the selected game (active game by default, consistent with the US-32 game selector)
- Clicking a match expands a breakdown showing the number of participants who picked Team A, Team B, and Draw; clicking again collapses it (same toggle behavior as US-03)
- Counts include every participant with a pick for that match; matches with no predictions show 0 / 0 / 0
- Participants with no pick for a match are not counted in any option
- If the match result is set, the breakdown highlights the winning option
- Visible without any login; works on mobile within the existing responsive layout (US-04)

### US-34 · Re-join a New Game After a Previous One ✅
**As a** returning visitor who participated in a previous game,
**I want** the homepage to recognise that my saved token belongs to an old game and offer me the option to join the new active game,
**So that** I am not permanently stuck on "My Predictions" from a past game and can participate in every new game.

**Root cause:** the app stores an `entry_token` in `localStorage` after joining a game, but never validates whether that token belongs to the current active game. When a new game opens, the stale token makes the homepage show "My Predictions" (for the finished game) instead of "Join Game" (for the new one).

**Acceptance Criteria:**
- On page load, if a token exists in `localStorage`, the app validates it against the server (`GET /api/participants/me`) and checks whether the returned game is the current active game
- If the token belongs to a finished or locked game that is **not** the current active game, the app clears the stale token from `localStorage` and shows "Join Game" (if a game is open)
- If the token belongs to the current active game, the app continues to show "My Predictions" as before (US-30 behaviour unchanged)
- The validation is done server-side; the client trusts the server response
- After joining the new game, the new token is stored and "My Predictions" is shown correctly
- If no game is currently `open`, neither button is shown regardless of token state (US-29 behaviour unchanged)

### US-38 · Prepare a New Game While the Current Game Is Still Active ✅
**As an** admin,
**I want to** create and configure a new game (add matches, set prize/cost settings) while the current game is still running,
**So that** the next game is ready to open the moment the current one finishes, without any downtime between rounds.

**Acceptance Criteria:**
- A new `draft` status is added to the game lifecycle: `draft → open → locked → finished`
- Admin can create a new game at any time — even while another game is `open` or `locked` — and it starts in `draft` status
- While in `draft`, the admin can add matches, configure entry cost, commission, prize tiers, and prize/rules content for the upcoming game
- A draft game is not visible to participants; the join page and public leaderboard never show a draft game
- Admin can transition a draft game to `open` only when no other game is currently `open` or `locked`
- At most one game may be `open` or `locked` at any time (existing constraint from US-27 preserved)
- The admin game list shows all games including drafts, with a "Draft" status badge
- A draft game can be deleted if the admin decides not to use it (no participants or predictions yet)

**Amends:** US-26 (game creation now always results in `draft` first, not `open`) and US-27 (lifecycle is now `draft → open → locked → finished`).

---

### US-39 · Lock Match Management Once a Game Has Started ✅
**As the** system,
**I want** the admin matches tab to become read-only once the game is `locked` or `finished`,
**So that** match fixtures cannot be altered after participants have already locked in their picks.

**Acceptance Criteria:**
- When the selected game is `open` or `draft`: admin has full CRUD on matches (add, edit, delete) — existing behaviour unchanged
- When the selected game is `locked`: all match add/edit/delete controls are disabled; a notice explains why (e.g. "Game has started — matches are locked")
- When the selected game is `finished`: same read-only state as `locked`
- The restriction is enforced server-side: match write endpoints (`POST`, `PUT`, `DELETE` on `/api/admin/matches`) return 403 for `locked` or `finished` games
- Setting match results (`PUT /api/admin/matches/:id/result`) remains allowed while `locked` — that is the intended workflow for recording scores (US-10)

---

### US-37 · Lock Prediction Grid for Finished Games ✅
**As an** admin,
**I want** the predictions grid to be read-only when the selected game is `finished`,
**So that** the final standings and prediction history cannot be accidentally altered after a game is over.

**Acceptance Criteria:**
- On the admin Predictions page, all pick controls (dropdowns, buttons, or inputs) are disabled when the selected game's status is `finished`
- A clear notice is shown at the top of the page explaining why editing is disabled (e.g. "This game is finished — predictions are locked")
- The read-only state is enforced server-side: the API rejects any prediction write (`PUT /api/admin/predictions`) for a `finished` game and returns 403
- Games with status `open` or `locked` are unaffected — the existing edit behaviour (US-15) continues as before
- The lock applies to all predictions in the grid, not just individual rows

---

### US-35 · Confirm Predictions with a Finish Button ✅
**As a** participant,
**I want to** click a "Finish" button after filling in my predictions,
**So that** I have a clear moment of confirmation that my picks have been submitted and are ready.

**Acceptance Criteria:**
- A "Finish" button is shown on the My Predictions page once the participant has made at least one pick
- Clicking Finish sends a confirmation request to the server and displays a success message
- The success message is configurable by the admin (new setting: `finish_message`); if not set, the default message is displayed (e.g. "Game set — good luck!")
- The admin sets the custom finish message from the game settings page alongside prize/rules content
- After finishing, the participant can still return and change picks while the game is `open` (Finish is a confirmation, not a lock)
- Finish button and message are not shown when the game is `locked` or `finished`

---

### US-36 · Game Cost, Commission, and Prize Pool ✅
**As an** admin,
**I want to** set the entry cost per player, a commission percentage, and a tiered prize structure for each game,
**So that** the system can calculate and display the total fund collected, commission amount, and exact prize money for each prize tier automatically.

**Acceptance Criteria:**

_Configuration (admin game settings):_
- Admin sets **entry cost** per player (e.g. $10) for the game
- Admin sets **commission percentage** (e.g. 10%) — the organiser's cut taken from total collected before prizes
- Admin can add **one or more prize tiers**, each with a label (e.g. "1st Prize", "2nd Prize") and a percentage of the prize pool
- Prize tier percentages refer to the **prize pool** = total collected − commission
- The UI shows the running total of all tier percentages and warns if they exceed 100%
- Admin can add, edit, or remove prize tiers at any time while the game is not finished

_Calculations:_
- Total collected = number of participants × entry cost
- Commission (dollar amount) = total collected × commission %
- Prize pool = total collected − commission
- Each prize tier amount = prize pool × tier percentage

_Dashboard display:_
- Dashboard shows (for the selected game): total participants, total collected, commission amount (in dollars), prize pool, and each prize tier with its label and calculated dollar amount
- All amounts update automatically as participants join

_Example:_
> 20 players × $10 = $200 collected. 10% commission = $20. Prize pool = $180.
> 1st Prize (60%) = $108 · 2nd Prize (40%) = $72.

---

### US-40 · Lock User Management for Finished Games ✅
**As an** admin,
**I want** the Users tab to be read-only when the selected game is `finished`,
**So that** the participant list for a completed game cannot be altered after the fact, keeping its final results and history intact.

**Acceptance Criteria:**
- On the admin Users page, the Add User, Bulk Add, Edit, and Delete controls are disabled (or hidden) when the selected game's status is `finished`
- A clear notice is shown at the top of the page explaining why editing is disabled (e.g. "This game is finished — the participant list is locked")
- The read-only state is enforced server-side: user write endpoints (`POST`, `PUT`, `DELETE` on `/api/admin/users`, including bulk add) return 403 for a `finished` game
- Games with status `draft`, `open`, or `locked` are unaffected — existing user management (US-12 to US-14, US-22 to US-25) continues as before
- Mirrors the finished-game lock already applied to matches (US-39) and predictions (US-37)

---

### US-41 · Join Multiple Entries in the Same Game
**As a** player,
**I want to** add multiple entries to the same game without retyping my name each time, and optionally add an entry on someone else's behalf,
**So that** I can quickly run several prediction sets (mine or my friends') and have each one ranked on the leaderboard.

**Acceptance Criteria:**

_First entry:_
- The first time a player joins, the join form asks for their display name (this becomes their **base name**), exactly as today (US-29)

_Additional entries:_
- After the first entry, "Add another entry" does **not** ask for a name by default — it auto-creates the next entry as **base name + # + number** (e.g. "Alice #2", "Alice #3")
- The add-entry form has a checkbox/toggle: **"Whose entry is this?"** with options **Myself** (selected by default) and **Someone else**
- When **Myself** is selected (default), no name is requested — the auto-numbered base name is used
- When **Someone else** is selected, the form asks for that person's name; that name is used for the entry (duplicates auto-suffixed per US-25)
- There is no limit on the number of entries a player can create

_Management & scope:_
- Each entry has its own predictions and its own line on the leaderboard
- The device remembers all of the player's entries for the active game; My Predictions shows a switcher to move between them and the "Add another entry" action
- Switching entries shows that entry's picks; editing or finishing (US-35) affects only the selected entry
- Adding entries is only possible while the game is open; once locked, all of the player's entries are read-only (US-31)
- Only entries belonging to the current active game appear in the switcher; tokens from previous games are not shown (consistent with US-34)
- Each entry counts as a participant for the prize pool, so totals/commission/tiers already include every entry (US-36)

**Notes:** No schema change — `users` already allows multiple rows per game and one `entry_token` per row; the server join flow already creates a fresh entry per call. The work is client-side: remember the base name and the list of entry tokens (migrating the existing single `entry_token`), generate "base #N" names for self entries, prompt only for "someone else" entries, and add the switcher + add-entry UX scoped to the active game.

---

### US-42 · Run Multiple Open Games at the Same Time
**As an** admin,
**I want to** have more than one game open (and accepting predictions) at the same time,
**So that** I can run several tournaments/pools concurrently instead of one at a time.

**Acceptance Criteria:**
- More than one game can be in `open` (and `locked`) status simultaneously; opening a game no longer requires every other game to be finished
- Admin can create, open, lock, and finish each game independently of the others
- **Public side** — visitors can see and choose among all currently open games:
  - The join page lists every `open` game and lets the visitor pick which one to join (instead of assuming a single open game)
  - The leaderboard/matches game selector (US-32) includes all open games, not just finished ones
  - When no game is explicitly selected, a sensible default is shown (e.g. the most recently opened game) and the visitor can switch
- **Participants** — a player's entries and `entry_token`s are already scoped to a specific game; joining one open game does not affect another. My Predictions makes clear which game an entry belongs to (carried through with US-41's switcher)
- **Admin scoping** — the existing per-game scope selector (dashboard, matches, users, predictions, settings) continues to work; each open game is managed independently
- Every game's prize pool, leaderboard, and locks (US-36, US-37, US-39, US-40) operate per game, unchanged

**Amends:** US-27 and US-38 — removes the "at most one game may be open or locked at a time" constraint. Game creation and the draft → open transition no longer block on another active game.

**Notes:** No schema change. The main work is removing the single-active-game guards (`gamesController.create`/`updateStatus`, which use `Game.findActive()`), redefining how the public default game is resolved when several are open (`gameScope` / `findActive` currently return a single game), and updating the join page and public game selector to handle a list of open games rather than one. Needs care around `participantsController.join` and US-34/US-41, which currently assume a single active game per device.

---

## Navigation & Tabs (v2 additions)

| Tab | Route | Access |
|-----|-------|--------|
| Join Game | `/join` | Public (only while a game is `open`) |
| Game selector | on `/` | Public |
| Matches | `/matches` | Public |
| Game Management | `/admin/games` | Admin only |

---

## MySQL Schema (Draft — v2 additions)

```sql
-- New: one row per game/tournament
games (id, name UNIQUE, status ENUM('draft','open','locked','finished'), created_at)

-- Existing tables gain a game scope
matches     + game_id FK
users       + game_id FK, entry_token (device re-identification), UNIQUE(game_id, display_name)
settings    + game_id FK (prize/rules per game)
             + entry_cost DECIMAL(10,2), commission_pct DECIMAL(5,2), finish_message TEXT

-- New: one row per prize tier per game
prize_tiers (id, game_id FK, rank INT, label VARCHAR(100), percentage DECIMAL(5,2))

-- predictions unchanged: already scoped via user_id/match_id
```

---

## Out of Scope (for v2)

- Accounts or passwords for participants
- Email notifications
- Match scheduling / countdown timers

_(Multiple concurrent active games moved into scope — see US-42.)_
