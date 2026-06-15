# World Cup Prediction Game — v3 User Stories

## Context

v1.0.0 (US-01 to US-25, see `user story.md`) shipped a single admin-managed
prediction game. v2 (US-26 to US-44, see `user_story_v2.md`) added multi-game
support, self-service participation, prize pools, and multiple concurrent games.
Throughout both versions there has only ever been **one kind of game**: players
predict the winner of each match (`team_a` / `team_b` / `draw`) and score a flat
**1 point per correct prediction**.

v3 introduces **game types**. Every game now has a type:

1. **Guess the Winners** — the existing game, unchanged. The default type; all
   current and historical games are this type.
2. **Survival Bracket** — a new type. The admin builds several *brackets* per
   game. Each bracket is a named list of country/teams with a required number of
   teams the player must pick and an admin-set number of points per correct pick.
   Players choose exactly that many teams in each bracket; after the event the
   admin marks the real winners, and each correct pick earns that bracket's
   points. Scoring is **cumulative** (sum across all brackets) — there is no
   elimination; "Survival" is branding only.

Numbering continues from v2: new stories start at **US-45**.

**SemVer note:** these stories require a schema migration — a `type` column on
`games` plus new `brackets`, `bracket_teams`, and `bracket_selections` tables.
That is a breaking change, so the target release is **v3.0.0**.

---

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Anyone who opens the app — no login required |
| **Participant** | A visitor who has joined a game by entering their name — still no login |
| **Admin** | Single privileged user who manages everything via a protected panel |

---

## Epic 11 — Game Types & the Survival Bracket

### US-45 · Choose a Game Type when Creating a Game
**As an** admin,
**I want to** pick a game type — "Guess the Winners" or "Survival Bracket" — when I create a game,
**So that** I can run different styles of prediction game instead of only the match-winner format.

**Acceptance Criteria:**
- The new-game form has a **type** selector with two options: **Guess the Winners**
  (default) and **Survival Bracket**
- The chosen type is stored on the game and shown in the admin game list
- The type can be changed only while the game is `draft`; once the game is `open`,
  `locked`, or `finished` the type is fixed
- A migration adds a `type` column to `games`; **every existing game is set to
  `guess_winners`** and behaves exactly as before (no visible change to current games)
- Admin pages adapt to the game's type:
  - `guess_winners` → the existing **Matches** and **Predictions** tabs (US-08 to US-18)
  - `survival_bracket` → a new **Brackets** tab (US-46) instead of Matches/Predictions
- The public side (join, leaderboard, breakdown) renders according to the selected
  game's type
- Lifecycle (`draft → open → locked → finished`), per-game scoping, prize pool, and
  finished-game locks apply to both types unchanged (US-27, US-36, US-37, US-39, US-40)

**Amends:** US-26 (game creation now also captures a type) and US-27 (admin tabs
shown for a game depend on its type). **BREAKING** — schema change.

---

### US-46 · Create and Manage Brackets
**As an** admin running a Survival Bracket game,
**I want to** create one or more brackets, each with a name, a list of teams, how many a player must pick, and the points per correct pick,
**So that** I can define exactly what players choose and how those choices score.

**Acceptance Criteria:**
- Available only for games whose type is `survival_bracket`
- Admin can add, edit, reorder, and delete **brackets** for the game
- Each bracket has:
  - a **name** (e.g. "Quarterfinalists", "Golden Boot")
  - an ordered **list of teams** (country/player names) — at least 2 teams
  - a **select count** = how many teams a player must pick from this bracket
  - **points per correct** = points awarded for each correctly picked team
- Validation: `1 ≤ select_count ≤ number of teams`; `points_per_correct ≥ 1`;
  team names are unique within a bracket
- A game can have any number of brackets (no cap, consistent with US-43)
- Brackets and their teams are fully editable while the game is `draft` or `open`;
  they become read-only once the game is `locked` or `finished` (mirrors the match
  lock in US-39)
- Deleting a bracket or removing a team also clears any player selections tied to it

**Notes:** New `brackets` + `bracket_teams` tables and `/api/admin/brackets`
endpoints. The CRUD/replace pattern can mirror `prizeTierModel.replaceAll()` and the
admin Matches page (`client/src/pages/admin/MatchesPage.jsx`); status gating reuses
`requireGameStatus` middleware.

---

### US-47 · Set Bracket Results (Winning Teams)
**As an** admin,
**I want to** mark which teams in each bracket actually won after the event,
**So that** the system can score players' picks and update the leaderboard.

**Acceptance Criteria:**
- For each bracket, the admin can flag any number of its teams as **winners**
  (an `is_winner` flag on the team), and clear them again
- Marking/clearing winners is allowed while the game is `open` or `locked` — the
  same workflow position as recording a match result (`PUT /matches/:id/result`,
  US-10) — and remains possible until the game is `finished`
- Once the game is `finished`, winners are read-only (US-37/US-40 parity)
- Setting or clearing winners immediately recomputes the leaderboard (US-49)
- Marking winners does not require the bracket's select count to match the number of
  winners — e.g. a "pick 4 of 10" bracket may have any number of teams that actually
  advanced; players only score for their own correct picks

**Notes:** Mirrors the matches result → leaderboard recompute flow in
`matchesController` + `predictionModel.leaderboard()`.

---

### US-48 · Select Teams in a Bracket
**As a** participant in a Survival Bracket game,
**I want to** pick exactly the required number of teams in each bracket and change them while the game is open,
**So that** I can enter my predictions for this game type.

**Acceptance Criteria:**
- In a `survival_bracket` game, the My Predictions page shows each bracket with its
  name, points-per-correct, and the full list of teams as selectable options
- The player must select **exactly `select_count`** teams per bracket; the UI prevents
  selecting more and indicates how many remain
- Saving is rejected server-side unless the selection count for a bracket equals its
  `select_count` (partial selections are allowed to be saved as drafts but flagged as
  incomplete — final pick must be complete)
- The device remembers the participant via the existing per-game entry token
  (US-30/US-34/US-41); multiple entries per player work as in US-41
- Selections are editable while the game is `open` and become read-only when the game
  is `locked` (parallel to US-31)
- Each bracket's selections are independent; switching entries (US-41) shows that
  entry's selections

**Notes:** New `bracket_selections` table keyed by `(user_id, bracket_team_id)`.
Participant access reuses `participantAuth` middleware and `entries.js`; the My
Predictions page branches on game type to render brackets instead of match rows.

---

### US-49 · Survival Bracket Scoring and Leaderboard
**As a** visitor,
**I want** the leaderboard and breakdowns to reflect Survival Bracket scoring,
**So that** I can see standings for this game type just like for a Guess the Winners game.

**Acceptance Criteria:**
- A player's score in a `survival_bracket` game = the sum, over every bracket, of
  (number of their picks that are winners × that bracket's `points_per_correct`)
- Scoring is **cumulative** — a wrong pick simply earns 0 for that pick; there is no
  elimination
- The leaderboard is **type-aware**: `survival_bracket` games use bracket scoring;
  `guess_winners` games keep the existing per-prediction scoring
  (`predictionModel.leaderboard()`) completely unchanged
- Ranking, tie-breaking, smart refresh, and the responsive layout behave as on the
  existing leaderboard (US-01 to US-04)
- A public per-bracket breakdown shows, for each team, how many players picked it, and
  highlights the winning teams once results are set (parallel to the match breakdown in
  US-33)
- Scores update automatically when the admin sets or clears bracket winners (US-47)
- Prize pool, cost, and commission (US-36) apply per game regardless of type

**Notes:** The leaderboard query becomes type-aware (branch on `games.type`); the
bracket score aggregates `bracket_selections` joined to `bracket_teams.is_winner` and
`brackets.points_per_correct`.

---

## Navigation & Tabs (v3 additions)

| Tab | Route | Access |
|-----|-------|--------|
| Brackets | `/admin/brackets` | Admin only (shown for `survival_bracket` games instead of Matches/Predictions) |
| Game type selector | on `/admin/games` (create form) | Admin only |

---

## MySQL Schema (Draft — v3 additions)

```sql
-- games gains a type; existing rows migrate to 'guess_winners'
games + type ENUM('guess_winners','survival_bracket') NOT NULL DEFAULT 'guess_winners'

-- New: one row per bracket in a survival_bracket game
brackets (
  id, game_id FK,
  name VARCHAR(150),
  select_count INT,          -- how many teams a player must pick
  points_per_correct INT,    -- points awarded per correct pick
  sort_order INT,
  created_at, updated_at
)

-- New: the team/country options within a bracket; admin flags the real winners (US-47)
bracket_teams (
  id, bracket_id FK,
  name VARCHAR(100),
  is_winner BOOLEAN NOT NULL DEFAULT 0,
  sort_order INT,
  UNIQUE(bracket_id, name)
)

-- New: a participant's picks (exactly select_count rows per user per bracket)
bracket_selections (
  id, user_id FK, bracket_team_id FK,
  created_at,
  UNIQUE(user_id, bracket_team_id)
)

-- matches / predictions are untouched: they continue to serve guess_winners games.
```

---

## Out of Scope (for v3)

- True elimination / survival mode (a wrong pick knocks the player out)
- Multiple sub-lists or groups within a single bracket (each bracket has one flat
  team list)
- Per-bracket prize tiers (prize pool stays per game, US-36)
- Additional game types beyond Guess the Winners and Survival Bracket
- Converting an existing game from one type to another after it leaves `draft`
