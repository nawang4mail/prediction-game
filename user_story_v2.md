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
games (id, name UNIQUE, status ENUM('open','locked','finished'), created_at)

-- Existing tables gain a game scope
matches     + game_id FK
users       + game_id FK, entry_token (device re-identification), UNIQUE(game_id, display_name)
settings    + game_id FK (prize/rules per game)

-- predictions unchanged: already scoped via user_id/match_id
```

---

## Out of Scope (for v2)

- Accounts or passwords for participants
- Email notifications
- Multiple concurrent active games
- Match scheduling / countdown timers
