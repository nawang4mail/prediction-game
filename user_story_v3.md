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

### US-50 · View a Player's Bracket Predictions from the Leaderboard ✅
**As a** visitor,
**I want to** tap or click a player on a Bracket Prediction leaderboard and see the teams they picked in each stage,
**So that** I can review other players' brackets, just like I can for a Guess the Winners game.

**Root cause:** the leaderboard's click-to-view detail (US-03) calls
`GET /api/leaderboard/:userId/predictions`, which returns match-based predictions
(`predictionModel.findByUser`). For a `bracket_prediction` game that player has no
match predictions, so the panel is empty — there is no way to see a player's stage
picks.

**Acceptance Criteria:**
- On a `bracket_prediction` leaderboard, tapping/clicking a player row expands a panel
  showing each stage and the teams that player picked in it (same toggle behaviour as
  US-03; tapping again collapses it)
- Once the game's results are set, each shown pick indicates whether it was correct
  (the team actually qualified/won), consistent with how the game reveals winners
  (US-48: winners stay hidden until the game is `finished`)
- The per-player detail endpoint is **type-aware**: `bracket_prediction` games return
  the player's stage picks; `guess_winners` games keep returning match predictions
  (US-03) unchanged
- Works without any login and on mobile within the existing responsive layout (US-04)
- A player who has not picked in a stage simply shows no picks for that stage

**Notes:** Make `GET /api/leaderboard/:userId/predictions` (or a sibling endpoint)
branch on the player's game type, returning stages with the player's selected
`stage_team`s. The leaderboard detail panel renders stages for bracket games and the
existing match list otherwise.

---

### US-51 · Rank the Bracket Breakdown by Number of Selections ✅
**As a** visitor,
**I want** the Matches/Bracket tab to list each stage's teams ordered by how many players picked them, with the pick count shown,
**So that** I can see the most-backed teams in each stage at a glance.

**Acceptance Criteria:**
- On the public Bracket breakdown (the Matches tab for a `bracket_prediction` game,
  US-49), each stage lists its teams **ranked by number of selections, most-picked
  first**
- Each team row shows its selection count (and the relative bar already used for the
  match breakdown, US-33)
- Ties are broken stably (e.g. by the stage's original team order) so the list does not
  jump around between refreshes
- Qualifying/winning teams remain highlighted once results are set (US-49 behaviour
  preserved)
- The Guess the Winners match breakdown (US-33) is unchanged

**Amends:** US-49 (its per-stage breakdown was ordered by the admin's team order; it is
now ordered by selection count). **Notes:** order `breakdown()` results by `picks DESC`
with `sort_order` as the tie-breaker.

---

### US-52 · Connect Stages into Combined Stages ✅
**As an** admin,
**I want to** connect stages so a later stage automatically inherits the teams a player selected in its parent stages,
**So that** I can build a real multi-round bracket (e.g. A + B → C, then C + D → E) where each round narrows down the player's own picks.

**Acceptance Criteria:**

_Admin design (dynamic & interactive):_
- When creating/editing a stage, the admin can make it a **combined stage** by choosing
  one or more **parent stages** instead of typing a team list
- A combined stage has the same rule fields as any stage: `pick_count`,
  `points_per_correct`, `all_correct_bonus`
- Chaining is supported to any depth — a combined stage may have other combined stages
  as parents (A + B → C, C + D → E)
- Validation: parents must be earlier stages; a stage cannot be (directly or
  indirectly) its own parent — no cycles; a combined stage's `pick_count` cannot exceed
  the total it can inherit (sum of its parents' `pick_count`s)
- Combined stages are editable only while the game is `draft`/`open` (US-46); changing a
  parent re-validates descendants

_Player experience:_
- The player sees every stage (A, B, C, …). A combined stage's candidate teams are the
  **union of the teams that player selected in its parent stages**
- As the player changes their picks in a parent stage, the combined stage's available
  teams update live; picks in the combined stage that are no longer valid are cleared
- The player still picks exactly `pick_count` teams in the combined stage (US-48 rules
  apply per stage)

_Scoring & results:_
- The admin sets results for every stage including combined ones (US-47), marking the
  actual qualifiers/winners among that stage's team pool
- Score **accumulates across all stages** (US-49), combined stages included — each is
  scored independently by the player's picks in it

**Amends:** US-46 (a stage's teams can be inherited from parents rather than typed),
US-47 (results apply to combined stages too), and US-48 (the player view shows inherited
teams). Brings the previously out-of-scope "auto-linked stages" into v3.

**Notes:** Suggested model — a `stage_parents (stage_id, parent_stage_id)` link table
(or a parent list) plus a flag marking a stage's teams as derived. A combined stage's
canonical `stage_teams` is the de-duplicated **union of its parents' teams**, kept in
sync when parents change, so `is_winner` (US-47) and `stage_selections` (US-48) work
unchanged; each player only sees/picks the subset they actually advanced from the
parents. The parent-team union and per-player available set are computed when building
the player's view and when validating a save.

---

### US-53 · Point Breakdown in the Leaderboard Player Detail ✅
**As a** player,
**I want to** see how many points each of another player's picks earned when I open their detail on the leaderboard,
**So that** I understand exactly how their score was built, not just which teams they picked.

**Acceptance Criteria:**
- In the bracket leaderboard detail panel (US-50), every pick shows the points it earned:
  a **correct** pick (its team is a winner) is highlighted green with `+<points_per_correct>`
  shown beside it; an **incorrect** pick shows no points
- When **all** of a player's picks in a stage are correct, that stage's `all_correct_bonus`
  is shown beside the stage name (e.g. "Group Stage · +5 bonus")
- The `+points` sit **outside** the team chip with no background — only the team name is
  highlighted green — so the score reads as visually separate from the team
- Points and bonus are shown once the stage's results are set by the admin (US-47) — the
  same moment the leaderboard total and the public breakdown reflect them; before any
  result is set nothing is revealed
- The Guess the Winners detail panel (US-03) is unchanged
- Works without login and on mobile within the existing responsive layout (US-04)

**Notes:** Extend the bracket branch of `GET /api/leaderboard/:userId/predictions` to
include each stage's `points_per_correct` and `all_correct_bonus` (and whether the player
got every pick in the stage correct); render the per-pick points and per-stage bonus in
`PredictionDetail`.

---

### US-54 · Fix and Improve the Matches Tab for Bracket Games ✅
**As a** visitor,
**I want** the Matches tab to actually show a Bracket Prediction game's stages and how many players picked each country,
**So that** I can browse the crowd's picks for a bracket game the same way I can for a match game.

**Root cause:** the public `GET /api/games` returns only `{id, name, status, created_at}` —
it omits the game `type`. The Matches page (`MatchesListPage`) chooses bracket vs. match
mode with `isBracket(game?.type)`, so with `type` missing it always falls into match mode
and renders the empty match list (a bracket game has no matches). Result: the Matches tab
shows nothing for a bracket game.

**Acceptance Criteria:**
- The public games list includes each game's `type`, so the Matches tab can tell a bracket
  game from a Guess the Winners game
- For a `bracket_prediction` game the Matches tab lists the **stages**; tapping a stage name
  expands it to show its countries/teams, each with a **"Players" count = number of players
  who picked that team**
- Teams within a stage are ranked most-picked first (US-51); qualifying/winning teams are
  highlighted once results are set (US-49)
- The tab reflects the game the visitor is viewing via the `?game=` selector (US-32 /
  `PublicGameNav`), not just the default game
- The Guess the Winners Matches tab (US-33) is unchanged

**Notes:** One-line fix in `server/src/routes/games.js` to pass `type` through; the stage
breakdown UI already exists (`MatchesListPage` + `bracketStageModel.breakdown()`, US-49/US-51).

---

### US-55 · Stage Description (Admin) ✅
**As an** admin,
**I want to** add an optional description to each stage,
**So that** I can explain the stage's rules or context to players (e.g. "Pick the 8 teams you think reach the quarter-finals").

**Acceptance Criteria:**
- When adding or editing a stage (US-46), the admin can enter an optional **description**
- The description is shown on the admin stage card, in the participant's bracket view
  (US-48), and in the public stage breakdown (US-54)
- The description is optional; a stage with none simply shows no description
- Editable under the same rules as other stage fields — only while the game is `draft`/`open`
  (US-46) — and unaffected for Guess the Winners games

**Amends:** US-46 (stage definition gains a description). **Notes:** migration adds
`description TEXT NULL` to `bracket_stages`; thread it through `bracketStageModel`
create/update, `bracketController.parseStage`, the admin `BracketPage` form, and the read
paths that already return stages.

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
  description TEXT NULL,                 -- optional admin note per stage (US-55)
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
- Multiple sub-lists or groups within a single stage (each stage has one flat team list)
- Per-stage prize tiers (prize pool stays per game, US-36)
- Additional game types beyond Guess the Winners and Bracket Prediction
- Converting an existing game from one type to another after it leaves `draft`
