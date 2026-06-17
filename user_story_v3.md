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

### US-56 · Step-by-Step Bracket Prediction Wizard ✅
**As a** player in a Bracket Prediction game,
**I want to** fill in my bracket one stage at a time with clear navigation,
**So that** entering my predictions feels simple instead of an overwhelming wall of stages.

**Acceptance Criteria:**
- Making or editing bracket predictions runs as a **wizard that shows one stage at a time**,
  with a **progress bar** at the top showing "Stage X of N"
- Each step shows that stage's teams; the player selects exactly `pick_count`, then uses
  **Back**, **Next**, **Save**, and **Cancel**:
  - **Next / Back** move between stages; **Next** is enabled only once the current stage's
    `pick_count` is met; **Back** is always available (and not shown on the first stage)
  - **Save** commits the whole bracket at once and is **enabled only when every stage is
    complete**; on success it returns to the read-only My Predictions view (US-57)
  - **Cancel** discards all in-progress changes **after a confirmation warning** and
    returns without saving
- In-progress picks are held in memory until Save, so Cancel can discard them
- For combined stages (US-52), the wizard shows the teams the player advanced from their
  **in-wizard** parent picks, updating live as they move forward
- The wizard is used for both the first-time entry and later edits, and is unavailable once
  the game is `locked`/`finished` (read-only, US-31)

**Amends:** US-48 (replaces the all-stages-at-once, per-stage-save layout with this wizard).
**Notes:** client-only — on Save, loop `PUT /participants/me/bracket` per stage in stage
order so a combined stage validates against its now-saved parents; compute combined
availability client-side from the in-memory picks (the client already has stages,
`parent_ids` and teams from `/me`). No new endpoint or schema change.

---

### US-57 · Edit Button on My Predictions (Bracket) ✅
**As a** player,
**I want** my bracket predictions to be read-only until I tap an Edit button,
**So that** I can review my picks without changing them by accident.

**Acceptance Criteria:**
- Opening My Predictions for a `bracket_prediction` game shows the player's picks
  **read-only** by default — a per-stage summary of the teams they picked
- An **Edit** button launches the prediction wizard (US-56); picks can only change through
  Edit
- After saving in the wizard, the view returns to the read-only summary; the Finish action
  (US-35) remains available
- Edit is offered only while the game is `open`; a `locked`/`finished` game shows the
  read-only summary with no Edit button
- The Guess the Winners My Predictions grid (click-to-pick, US-30) is unchanged

**Notes:** client-only in `MyPredictionsPage` — render a read-only stage summary for bracket
games and gate the wizard behind an Edit toggle.

---

### US-58 · Clean Add-Entry View ✅
**As a** player adding another entry,
**I want** the Add-entry step to show only the "Whose entry is this?" question and its options,
**So that** I'm not distracted by the previous entry's predictions while choosing.

**Acceptance Criteria:**
- When the player taps **Add entry** (US-41), the page shows **only** the "Whose entry is
  this?" prompt and its options (Myself / Someone else)
- The current entry's predictions/stages (and the Finish action) are **hidden** while the
  add-entry panel is open
- Cancelling or completing add-entry returns to the normal My Predictions view
- Applies to both game types (the add-entry panel is shared)

**Root cause:** in `MyPredictionsPage` the add-entry panel (`adding` state) renders above
the prediction content, which still renders unconditionally below it, cluttering the
add-entry step. **Notes:** hide the prediction content (and Finish) while `adding` is true.

---

### US-59 · Wizard Save Doubles as Finish (Bracket) ✅
**As a** player in a Bracket Prediction game,
**I want** the wizard's Save to confirm my entry with the finish message,
**So that** I'm not confused by a separate "Finish — Send My Predictions" button that does the same thing.

**Acceptance Criteria:**
- The separate **Finish — Send My Predictions** button is **removed for bracket games**
  (the wizard's Save, US-56, is the single confirm action)
- After the wizard saves the whole bracket, the app shows the admin-configured finish
  message (US-35 `finish_message`, or its default) — the same confirmation the Finish
  button used to show
- The Guess the Winners flow keeps its Finish button (US-35) unchanged

**Notes:** client-only in `MyPredictionsPage` — the wizard's `onSaved` calls the existing
`POST /participants/me/finish` after saving, and the Finish button renders only for
`guess_winners` games.

---

### US-60 · Delete Finished or Draft Games ✅
**As an** admin,
**I want to** delete a draft or a finished game,
**So that** I can remove test/unwanted drafts and clear out old archived games.

**Acceptance Criteria:**
- The admin can delete a game whose status is **`draft`** or **`finished`**
- A live game (`open` or `locked`) cannot be deleted; the API returns 409 and the admin
  game list shows no Delete action for it (so an in-progress game's data is never lost)
- Deleting a game removes it and all its data (matches/stages, users, predictions,
  settings, prize tiers) via the existing cascade
- The admin game list shows a **Delete** action on draft and finished rows; deleting a
  **finished** game prompts a clear warning that its leaderboard and history are removed
  permanently

**Amends:** US-38 (previously only drafts were deletable). **Notes:** widen the
`gamesController.remove` guard from `draft` only to `draft`/`finished`; add a Delete
button to finished rows in `GamesPage` with a stronger confirmation message.

---

### US-61 · Delete Multiple Games at Once ✅
**As an** admin,
**I want to** select several games and delete them in one action,
**So that** I can clean up many old or test games quickly instead of one at a time.

**Acceptance Criteria:**
- The admin game list shows a checkbox on each **deletable** row (draft or finished);
  live (`open`/`locked`) games have no checkbox and can't be selected
- A "Delete selected" action appears once one or more games are selected and removes them
  all in one request
- The server enforces the same rule (US-60): only draft/finished games can be deleted; if
  any selected game is live (or no longer exists) the whole request is rejected and
  nothing is deleted
- Deleting finished games is confirmed with a clear warning that their leaderboards and
  history are removed permanently
- Selecting and deleting cascades each game's data exactly like a single delete (US-60)

**Notes:** new `POST /api/admin/games/bulk-delete` (`{ ids }`) backed by
`gameModel.findByIds` + `removeMany`, validating all ids against the `draft`/`finished`
guard; `GamesPage` adds per-row checkboxes and a bulk-delete bar.

---

### US-62 · "User's Entries" Admin Tab (Bracket Prediction) ✅
**As an** admin running a Bracket Prediction game,
**I want** a "User's entries" tab listing every participant's entry and the teams they picked,
**So that** I can review what everyone selected, read-only, without risk of changing it.

**Acceptance Criteria:**
- For a `bracket_prediction` game, the admin navigation shows a new **User's entries** tab
  alongside the **Bracket** tab (Guess the Winners keeps Matches + Predictions, US-45)
- The tab lists **every entry in the scoped game** by display name, including a player's
  multiple entries (US-41) and respecting the admin game selector (per-game scope)
- Each entry shows its picks **per stage** (the teams it selected) in **read-only** mode —
  there are no controls to add, edit, or delete picks (mirrors the participant read-only
  summary, US-57)
- If a stage's results are set, the entry's winning picks are highlighted; a stage the
  entry has not picked shows "no picks"
- An empty state is shown when the game has no entries yet
- Shown only for bracket games; Guess the Winners is unaffected

**Notes:** new read endpoint `GET /api/admin/bracket/entries` (auth + `gameScope`) that
returns each participant of the scoped game with their stage picks — back it with a
`stageSelectionModel` query (all selections for a game's users joined to `stage_teams` and
`bracket_stages`) plus `userModel.findAll`, grouped per user → stage → picked teams
(parallels `predictionModel.findAll`). New admin `EntriesPage` + `/admin/entries` route;
add the tab to `AdminLayout`'s bracket tab list; reuse the read-only layout from
`BracketSummary`. No schema change.

---

### US-63 · Lock User Predictions from Admin Editing Once the Game Starts ✅
**As an** admin,
**I want** a user's predictions to become read-only once the game has started,
**So that** nobody's picks — not even via the admin panel — can change after kickoff.

**Acceptance Criteria:**
- An admin can edit a user's predictions/entries only while the game is `draft` or `open`;
  once the game is `locked` (started) or `finished`, they are **read-only**
- The Guess the Winners admin Predictions grid disables its pick controls when the game is
  `locked` (in addition to `finished`, US-37), with a clear notice
- Enforced server-side: prediction write endpoints (`POST` / `DELETE` on
  `/api/admin/predictions`) return 403 when the game is `locked` or `finished`
- Bracket Prediction entries are already admin-read-only with no edit path (US-62), so they
  already comply — no change needed there
- Recording match results (US-10) is unaffected — admins still set results while `locked`

**Amends:** US-37 (was finished-only) and supersedes the US-31 note that allowed admin
corrections while `locked`. **Notes:** change the `editable` guard in
`server/src/routes/admin/predictions.js` from `('draft','open','locked')` to
`('draft','open')`; `PredictionsPage` treats `locked` like `finished` (read-only), which it
already handles for `finished`.

---

### US-64 · Bracket Dashboard: Max Points, No Matches ✅
**As an** admin running a Bracket Prediction game,
**I want** the dashboard to show the maximum achievable points and drop the Matches stat,
**So that** the dashboard reflects the bracket format instead of match-based numbers.

**Acceptance Criteria:**
- For a `bracket_prediction` game the dashboard does **not** show the Matches stat (bracket
  games have no matches, US-45)
- The dashboard shows a **Max Points** stat = the maximum achievable score =
  Σ over stages of (`pick_count` × `points_per_correct` + `all_correct_bonus`)
- The dashboard's Top 5 uses bracket scoring (type-aware) so it reflects real bracket points
  (US-49), not the empty match predictions
- The Guess the Winners dashboard is unchanged (keeps its Matches card and existing stats,
  US-19/US-36)

**Notes:** make `dashboardController.getStats` type-aware — for bracket games compute
`max_points` from `bracketStageModel.findByGame` and use `bracketStageModel.leaderboard` for
`top5`, and omit the matches block; `DashboardPage` hides the Matches card and renders a Max
Points card for bracket games.

---

### US-65 · Approve or Decline a User's Entry (with message) ✅
**As an** admin,
**I want to** approve or decline each user's entry and attach a message when declining,
**So that** I can vet self-service joiners, and a declined player is told why.

**Acceptance Criteria:**
- Each user/entry has an **approval status** — `approved` or `declined` — and an optional
  **status message**
- The admin **Users** tab shows a **Status** column with Approve / Decline controls per
  user; declining lets the admin enter/edit a message, approving marks the entry approved
- **Defaults:** users the admin adds (single, bulk, and bulk-with-predictions, US-12 to
  US-14, US-22/US-23) are **approved**; participants who self-join (US-29) — including extra
  entries (US-41) — are **declined** with a default message (e.g. "Your entry is awaiting
  admin approval — please contact the admin.")
- When a participant's entry is **declined**, its status message is shown to them on the
  My Predictions page (a clear banner); status is per entry (US-41), so the switcher
  reflects the status of the selected entry
- Applies to both game types and to each entry independently; status changes follow the
  finished-game lock rules already on the Users tab (US-40)

**Out of scope (assumption):** a declined entry still appears on the public leaderboard —
decline is informational plus a message in this story; excluding declined entries from the
leaderboard/scoring can be a follow-up if wanted.

**Notes:** migration adds `status ENUM('approved','declined') NOT NULL DEFAULT 'approved'`
and `status_message TEXT NULL` to `users`. `userModel.createWithAutoSuffix` inserts
`declined` + the default message when an `entry_token` is supplied (self-join) and relies on
the `approved` default otherwise. New `userModel.setStatus` + `PUT /api/admin/users/:id/status`
(`{ status, message }`); `participantsController.me` returns `status` + `status_message`;
`UsersPage` adds the Status column + Approve/Decline controls; `MyPredictionsPage` shows the
message banner when declined.

---

### US-66 · Approval Drives Counts, Finance and Admin Views ✅
**As an** admin,
**I want** approved and declined users reflected across the dashboard, finance, and the entries/predictions views,
**So that** the app only counts and shows approved participants where it matters.

**Acceptance Criteria:**
- The dashboard shows two participant counts: **Users** = approved participants, and a new
  **Pending Users** = declined participants (US-65)
- **Total Collected** — and therefore commission and prize pool (US-36) — is computed from
  the **approved** participant count only
- The bracket **User's entries** tab (US-62) lists only **approved** users' entries
- The Guess the Winners **Predictions** grid (US-15/US-16) shows only **approved** users'
  predictions
- Applies to both game types (dashboard counts + finance for both; entries for bracket,
  predictions grid for guess-winners); the Users tab itself still lists everyone so the
  admin can approve/decline (US-65)

**Out of scope (assumption):** the public leaderboard still lists all entries (declined
included) — excluding declined entries from the public leaderboard/scoring remains a
possible follow-up.

**Amends:** US-19/US-36 (dashboard counts + finance), US-62 (entries), US-15/US-16
(predictions grid). **Notes:** `dashboardController.getStats` returns `users` (approved) and
`pending_users` (declined) via `SUM(status=…)` and computes finance from the approved count;
`DashboardPage` adds a Pending Users card; `bracketController.entries` filters to approved
users; `PredictionsPage` renders only approved users (the shared `/api/admin/users` still
returns everyone for the Users tab).

---

### US-67 · Warn About Entries Pending Approval ✅
**As a** player with more than one entry,
**I want** My Predictions to warn me how many of my entries are awaiting approval,
**So that** I notice pending entries even while viewing an approved one.

**Acceptance Criteria:**
- On My Predictions, if one or more of the player's entries for the active game (on this
  device, US-41) are **declined / pending approval** (US-65), a warning banner shows the
  **total count** pending — e.g. "2 of your 3 entries are pending admin approval."
- The warning summarises across **all** of the player's entries for that game, not just the
  selected one; it complements the per-entry declined message (US-65) shown for the selected
  entry
- No warning is shown when none of the player's entries are pending
- Updates after the admin approves/declines (on the next load or entry switch)
- Works for both game types

**Notes:** the device already holds the player's entry tokens (`entries.js` →
`entriesForGame`), but `/participants/me` returns only the current entry's status. Add a
batch lookup — e.g. `POST /api/participants/statuses` with `{ tokens }` returning
`[{ token, status }]` (each validated via `findByEntryToken`) — and have `MyPredictionsPage`
count `declined` among its entries for the game to render the warning. Client-only plus one
read endpoint; no schema change (uses `users.status`, US-65).

---

### US-68 · Don't Keep Cancelled, Incomplete Entries ✅
**As a** player,
**I want** an entry I cancel before completing it to leave no record,
**So that** abandoned join/add-entry attempts don't clutter the game — but editing an existing entry and cancelling never deletes it.

**Acceptance Criteria:**
- When a player starts a **brand-new entry** (join, US-29, or "add another entry", US-41)
  and **cancels before saving any picks**, that entry's record is removed from the database —
  no empty/orphan entry remains
- When a player **edits an existing entry** (US-56/US-57) and **cancels the edit**, the entry
  and its saved picks are kept — cancelling an edit never deletes the user
- A **completed** entry (one with any saved picks/predictions) is never removed by a cancel
- After a cancelled new entry is removed, the device forgets its token and returns to a
  remaining entry, or to the join screen if none remain
- Applies to both game types

**Out of scope (assumption):** this is delete-on-cancel of the just-created row, not a
rework to defer row creation until completion (the entry token, `/me`, and the switcher all
assume a row exists); the observable result is the same — a cancelled incomplete entry
leaves no record.

**Notes:** new guarded `DELETE /api/participants/me` (`participantAuth`) → `userModel.remove`,
allowed only while the game is `open` and the entry has **no** saved selections/predictions
(so a completed entry can never be self-deleted — backstops the "edit cancel must not
delete" rule). The client tracks whether the session is a brand-new entry and only calls the
delete on cancel of a new entry (dropping the token via a new `entries.js` `removeEntry`);
cancelling an edit just exits (US-56 `onCancel`).

---

### US-69 · Fix: First Game Created as Bracket Prediction Shows the Wrong Admin Tabs ✅
**As an** admin,
**I want** a Bracket Prediction game to show the **Bracket** tab even when it is the very
first game I create,
**So that** I can manage stages immediately instead of being shown the Matches/Predictions
tabs that don't apply to a bracket game.

**Root cause:** `AdminLayout` (`client/src/components/admin/AdminLayout.jsx`) loads the
games list once on mount (`useEffect(..., [])`) and never refreshes it after a game is
created on `GamesPage`. It picks the tab set with `isBracket(scopedGame?.type)`, where
`scopedGame` comes from `resolveScopedGame(games, selectedGame)`. When the first-ever game
is created, AdminLayout's `games` state is still empty, so `scopedGame` is `null` and the
layout falls back to `GUESS_TABS` (Matches + Predictions). Creating a bracket game *second*
works only because a page reload has repopulated the list by then. (Secondary: the client's
`resolveScopedGame` falls back to `games[0]`, including drafts, which does not mirror the
server's `findLatestVisible()` that excludes drafts.)

**Acceptance Criteria:**
- Creating a Bracket Prediction game as the **first** game in the system shows the
  **Bracket** (and **User's entries**, US-62) tabs — never Matches/Predictions
- The correct tabs appear **without needing a manual page reload** after the game is created
- The fix holds regardless of how many games already exist (first, second, or Nth game) and
  regardless of game status (`draft`/`open`/`locked`/`finished`)
- A Guess the Winners game still shows the **Matches** + **Predictions** tabs (US-45
  unchanged)
- The admin game-scope selector keeps choosing the right game's tabs when switched (US-27 /
  per-game scope)

**Notes:** Refresh AdminLayout's games list after a game is created (e.g. re-fetch on route
change to `/admin/games`, lift the games state, or expose a refresh callback) so
`scopedGame`/tab selection reflects the new game immediately. Consider aligning the client
`resolveScopedGame` fallback with the server's `findLatestVisible()` (exclude drafts) and
de-duplicating the copy in `client/src/pages/admin/BracketPage.jsx`. Client-only; no schema
change. Amends US-45.

---

### US-70 · Fix: Admin Panel Blank When the Only Game Is a Draft ✅
**As an** admin,
**I want** the admin panel to load and show my game's data when the only game in the system
is a draft (e.g. the first game I just created, US-69),
**So that** I can prepare a brand-new game instead of staring at a blank screen.

**Root cause:** the `gameScope` middleware resolves a request with no explicit `?game_id` to
`findActive() ?? findLatestVisible()`, and `findLatestVisible()` deliberately excludes
drafts (US-38). The admin game selector only appears when more than one game exists
(`games.length > 1`), so with a single draft game the admin sends no `game_id` and every
scoped admin endpoint returns 404 "No games exist yet". `DashboardPage` then had no error
handling — a 404 left `stats` null and `stats.matches` threw, blanking the **whole** admin
panel (nav included), since each admin page renders inside `AdminLayout`.

**Acceptance Criteria:**
- With only a draft game present, the admin dashboard and every scoped admin page
  (`matches`, `bracket`, `users`, `predictions`, `settings`) load **that draft game's**
  data instead of returning 404
- An authenticated admin request with no explicit `game_id` falls back to the **latest game
  including drafts**; the **public** side still never falls back to a draft (US-38 preserved)
- When there are **no games at all**, the admin pages render a friendly empty state
  ("No games yet…") rather than a blank screen — the nav stays usable
- The Dashboard never crashes the whole panel on a failed or empty stats response

**Notes:** `gameScope` uses `findLatest` (includes drafts) when `req.admin` is set
(admin routes run `requireAuth` before `gameScope`), else `findLatestVisible` for the public
side. `DashboardPage` adds a `.catch` and guards a null `stats`. Surfaced by US-69 (first
game is a bracket draft). Server + client; no schema change.

---

## Navigation & Tabs (v3 additions)

| Tab | Route | Access |
|-----|-------|--------|
| Bracket (Stages) | `/admin/bracket` | Admin only (shown for `bracket_prediction` games instead of Matches/Predictions) |
| User's entries | `/admin/entries` | Admin only (bracket games; read-only list of participants' picks, US-62) |
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

-- users gain an approval status shown to the participant (US-65)
users + status ENUM('approved','declined') NOT NULL DEFAULT 'approved'
users + status_message TEXT NULL   -- e.g. why an entry was declined

-- matches / predictions are untouched: they continue to serve guess_winners games.
```

---

## Out of Scope (for v3)

- True elimination / survival mode (a wrong pick knocks the player out)
- Multiple sub-lists or groups within a single stage (each stage has one flat team list)
- Per-stage prize tiers (prize pool stays per game, US-36)
- Additional game types beyond Guess the Winners and Bracket Prediction
- Converting an existing game from one type to another after it leaves `draft`
