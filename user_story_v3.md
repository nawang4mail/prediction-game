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
2. **Bracket Prediction** — a new type: a FIFA-style bracket challenge. The admin
   **dynamically defines one or more stages** for the game (e.g. "Quarter-finalists",
   "Round of 16", "Champion"). Each stage is a named list of country/teams with a
   required number of teams the player picks, points per correct pick, and an
   all-correct bonus. **Players fill the whole bracket upfront** — they predict every
   stage in one sitting before the game locks. After the event the admin marks which
   teams actually qualified/won in each stage, and each correct pick earns that
   stage's points (plus a bonus if all of the player's picks in that stage are
   correct). Scoring is **cumulative** across stages — there is no elimination.

Stages are **independent and admin-defined**: the admin can include any combination
of stages (e.g. "QF qualifiers + Champion", or "Round of 16 + Final") in any order,
and types each stage's candidate team list directly. A later stage is **not**
auto-built from an earlier one — that keeps the game fully dynamic (you can skip
stages), and auto-linking is left as a future idea (see Out of Scope).

Numbering continues from v2: new stories start at **US-45**.

**SemVer note:** these stories require a schema migration — a `type` column on
`games` plus new `bracket_stages`, `stage_teams`, and `stage_selections` tables.
That is a breaking change, so the target release is **v3.0.0**.

---

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Anyone who opens the app — no login required |
| **Participant** | A visitor who has joined a game by entering their name — still no login |
| **Admin** | Single privileged user who manages everything via a protected panel |

---

## Epic 11 — Game Types & Bracket Prediction

### US-45 · Choose a Game Type when Creating a Game ✅
**As an** admin,
**I want to** pick a game type — "Guess the Winners" or "Bracket Prediction" — when I create a game,
**So that** I can run different styles of prediction game instead of only the match-winner format.

**Acceptance Criteria:**
- The new-game form has a **type** selector with two options: **Guess the Winners**
  (default) and **Bracket Prediction**
- The chosen type is stored on the game and shown in the admin game list
- The type can be changed only while the game is `draft`; once the game is `open`,
  `locked`, or `finished` the type is fixed
- A migration adds a `type` column to `games`; **every existing game is set to
  `guess_winners`** and behaves exactly as before (no visible change to current games)
- Admin pages adapt to the game's type:
  - `guess_winners` → the existing **Matches** and **Predictions** tabs (US-08 to US-18)
  - `bracket_prediction` → a new **Bracket** tab for managing stages (US-46) instead of
    Matches/Predictions
- The public side (join, leaderboard, breakdown) renders according to the selected
  game's type
- Lifecycle (`draft → open → locked → finished`), per-game scoping, prize pool, and
  finished-game locks apply to both types unchanged (US-27, US-36, US-37, US-39, US-40)

**Amends:** US-26 (game creation now also captures a type) and US-27 (admin tabs
shown for a game depend on its type). **BREAKING** — schema change.

---

### US-46 · Define Bracket Stages ✅
**As an** admin running a Bracket Prediction game,
**I want to** dynamically define one or more stages, each with a name, a list of teams, how many a player must pick, points per correct pick, and an all-correct bonus,
**So that** I can shape exactly what players predict and how each stage scores.

**Acceptance Criteria:**
- Available only for games whose type is `bracket_prediction`
- Admin can add, edit, reorder, and delete **stages** for the game
- Each stage has:
  - a **name** (e.g. "Quarter-finalists", "Round of 16", "Champion")
  - an ordered **list of teams** (country/player names) — at least 2 teams
  - a **pick count** = how many teams a player must select for this stage
  - **points per correct** = points awarded for each correctly picked team
  - an **all-correct bonus** = extra points the player earns only if every one of
    their picks in this stage is correct (set to 0 to disable)
- Validation: `1 ≤ pick_count ≤ number of teams`; `points_per_correct ≥ 1`;
  `all_correct_bonus ≥ 0`; team names are unique within a stage
- A game can have any number of stages, in any combination/order — stages are
  independent and the admin can skip whatever they like (no cap, US-43 parity)
- Stages and their teams are fully editable while the game is `draft` or `open`; they
  become read-only once the game is `locked` or `finished` (mirrors the match lock,
  US-39)
- Deleting a stage or removing a team also clears any player selections tied to it

**Notes:** New `bracket_stages` + `stage_teams` tables and `/api/admin/bracket`
endpoints. The CRUD/replace pattern can mirror `prizeTierModel.replaceAll()` and the
admin Matches page (`client/src/pages/admin/MatchesPage.jsx`); status gating reuses
`requireGameStatus` middleware.

---

### US-47 · Set Stage Results (Qualifying / Winning Teams) ✅
**As an** admin,
**I want to** mark which teams in each stage actually qualified or won after the event,
**So that** the system can score players' picks and update the leaderboard.

**Acceptance Criteria:**
- For each stage, the admin can flag any number of its teams as **winners/qualifiers**
  (an `is_winner` flag on the team), and clear them again
- Marking/clearing results is allowed while the game is `open` or `locked` — the same
  workflow position as recording a match result (`PUT /matches/:id/result`, US-10) —
  and remains possible until the game is `finished`
- Once the game is `finished`, results are read-only (US-37/US-40 parity)
- Setting or clearing results immediately recomputes the leaderboard (US-49)
- The number of teams marked as winners need not equal the stage's pick count — e.g. a
  "pick 8 of 32" stage may have any number that actually advanced; players only score
  for their own correct picks

**Notes:** Mirrors the matches result → leaderboard recompute flow in
`matchesController` + `predictionModel.leaderboard()`.

---

### US-48 · Make Bracket Predictions Upfront ✅
**As a** participant in a Bracket Prediction game,
**I want to** fill in all of the stages at once — picking the required number of teams in each — and change them while the game is open,
**So that** I can enter my whole bracket before the tournament starts.

**Acceptance Criteria:**
- In a `bracket_prediction` game, the My Predictions page shows **all stages at once**,
  each with its name, points-per-correct, all-correct bonus, and the full list of teams
  as selectable options
- The player must select **exactly `pick_count`** teams per stage; the UI prevents
  selecting more and shows how many picks remain in each stage
- Saving a stage is rejected server-side unless its selection count equals its
  `pick_count`; a complete entry requires every stage filled, and Finish (US-35)
  confirms the entry is complete
- The device remembers the participant via the existing per-game entry token
  (US-30/US-34/US-41); multiple entries per player work as in US-41
- Selections are editable while the game is `open` and become read-only when the game
  is `locked` (parallel to US-31)
- Each stage's selections are independent; switching entries (US-41) shows that
  entry's selections

**Notes:** New `stage_selections` table keyed by `(user_id, stage_team_id)`.
Participant access reuses `participantAuth` middleware and `entries.js`; the My
Predictions page branches on game type to render stages instead of match rows.

---

### US-49 · Bracket Prediction Scoring and Leaderboard ✅
**As a** visitor,
**I want** the leaderboard and breakdowns to reflect Bracket Prediction scoring,
**So that** I can see standings for this game type just like for a Guess the Winners game.

**Acceptance Criteria:**
- A player's score in a `bracket_prediction` game = the sum, over every stage, of:
  - (number of their picks that are winners × that stage's `points_per_correct`), plus
  - that stage's `all_correct_bonus` **only if every one of their picks in the stage is
    correct**
- Scoring is **cumulative** — a wrong pick simply earns 0 for that pick; there is no
  elimination
- The leaderboard is **type-aware**: `bracket_prediction` games use stage scoring;
  `guess_winners` games keep the existing per-prediction scoring
  (`predictionModel.leaderboard()`) completely unchanged
- Ranking, tie-breaking, smart refresh, and the responsive layout behave as on the
  existing leaderboard (US-01 to US-04)
- A public per-stage breakdown shows, for each team, how many players picked it, and
  highlights the qualifying/winning teams once results are set; the bonus is indicated
  (parallel to the match breakdown in US-33)
- Scores update automatically when the admin sets or clears stage results (US-47)
- Prize pool, cost, and commission (US-36) apply per game regardless of type

**Notes:** The leaderboard query becomes type-aware (branch on `games.type`); the
stage score aggregates `stage_selections` joined to `stage_teams.is_winner` and
`bracket_stages.points_per_correct` / `all_correct_bonus`.

---

## Navigation & Tabs (v3 additions)

| Tab | Route | Access |
|-----|-------|--------|
| Bracket (Stages) | `/admin/bracket` | Admin only (shown for `bracket_prediction` games instead of Matches/Predictions) |
| Game type selector | on `/admin/games` (create form) | Admin only |

---

## MySQL Schema (Draft — v3 additions)

```sql
-- games gains a type; existing rows migrate to 'guess_winners'
games + type ENUM('guess_winners','bracket_prediction') NOT NULL DEFAULT 'guess_winners'

-- New: one row per admin-defined stage in a bracket_prediction game
bracket_stages (
  id, game_id FK,
  name VARCHAR(150),
  pick_count INT,                       -- how many teams a player must pick
  points_per_correct INT,               -- points per correct pick
  all_correct_bonus INT NOT NULL DEFAULT 0, -- extra points if all picks correct
  sort_order INT,
  created_at, updated_at
)

-- New: candidate teams within a stage; admin flags the real qualifiers/winners (US-47)
stage_teams (
  id, stage_id FK,
  name VARCHAR(100),
  is_winner BOOLEAN NOT NULL DEFAULT 0,
  sort_order INT,
  UNIQUE(stage_id, name)
)

-- New: a participant's picks (exactly pick_count rows per user per stage)
stage_selections (
  id, user_id FK, stage_team_id FK,
  created_at,
  UNIQUE(user_id, stage_team_id)
)

-- matches / predictions are untouched: they continue to serve guess_winners games.
```

---

## Out of Scope (for v3)

- True elimination / survival mode (a wrong pick knocks the player out)
- Auto-linked stages — a later stage's team list automatically built from the teams
  that advanced in an earlier stage (admin types each stage's team list instead)
- Multiple sub-lists or groups within a single stage (each stage has one flat team list)
- Per-stage prize tiers (prize pool stays per game, US-36)
- Additional game types beyond Guess the Winners and Bracket Prediction
- Converting an existing game from one type to another after it leaves `draft`
