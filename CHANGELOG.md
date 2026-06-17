# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.0] - 2026-06-16

Refinements release. Covers user story US-71.

### Changed

- **Pending approval** — the "your entry is awaiting admin approval" warning is now
  a global banner pinned to the top of every public page (leaderboard, matches, my
  predictions), reflecting any pending entry on the device across all games, instead
  of only appearing inside My Predictions (US-71, amends US-67)

## [3.0.0] - 2026-06-16

Game types & Bracket Prediction release. Covers user stories US-45 to US-70.

**BREAKING** — requires a schema migration: a `type` column on `games`, the new
`bracket_stages`, `stage_teams`, `stage_selections`, and `stage_parents` tables,
a stage `description` column, and a `status` column on `users`. Run the
migrations before deploying.

### Added

- **Game types** — every game now has a type, chosen at creation: **Guess the
  Winners** (the existing match-winner game, the default) or **Bracket
  Prediction**; admin pages adapt to the type and all existing games migrate to
  `guess_winners` (US-45)
- **Bracket Prediction** — admins define one or more dynamic stages, each with a
  team list, pick count, points-per-correct, and an all-correct bonus; players
  fill the whole bracket upfront and score cumulatively (US-46 to US-49)
- **Combined stages** — stages can inherit the teams a player advanced from one
  or more parent stages, enabling real multi-round brackets (US-52)
- **Bracket UX** — step-by-step prediction wizard with progress, a read-only My
  Predictions view with an Edit button, optional per-stage descriptions, and the
  wizard's Save doubling as Finish (US-55 to US-59)
- **Public bracket views** — type-aware leaderboard, per-player stage picks with
  per-pick points, and a Matches/Bracket tab ranked by number of selections
  (US-50, US-51, US-53, US-54)
- **Admin bracket views** — a "User's entries" tab and a bracket-aware dashboard
  showing maximum achievable points instead of match stats (US-62, US-64)
- **Entry approval** — admins approve or decline each entry with an optional
  message; approval drives participant counts and finance, and players are warned
  about entries pending approval (US-65 to US-67)

### Changed

- **Games** — draft and finished games can be deleted, individually or in bulk
  (US-60, US-61)
- **Predictions** — a user's predictions become read-only to admins once the game
  is locked, not only when finished (US-63)

### Fixed

- **Admin tabs** — a Bracket Prediction game now shows the Bracket tab even when
  it is the first game created, without a manual reload (US-69)
- **Admin panel** — the panel no longer goes blank when the only game is a draft;
  an admin falls back to the latest game including drafts, and the dashboard
  degrades gracefully on an empty stats response (US-70)
- **Entries** — a brand-new entry cancelled before any picks are saved leaves no
  record, while cancelling an edit never deletes an existing entry (US-68)
- **Add entry** — the add-entry step shows only the "Whose entry is this?" prompt
  without the previous entry's predictions (US-58)

## [2.1.0] - 2026-06-14

### Changed

- **Matches** — removed the 10-match-per-game cap; admins can now add an
  unlimited number of matches to a game (US-43)

### Fixed

- **Games** — the admin Games page no longer disables the "Open" action while
  another game is active; drafts can be opened freely so multiple games can run
  at the same time, matching the server behaviour shipped in US-42
- **Homepage** — "My Predictions" and "Join the Game" are now two independent
  buttons instead of one that swaps between them, so a returning participant can
  still join a newly opened game (US-44)

## [2.0.0] - 2026-06-14

Multi-game release. Covers user stories US-26 to US-42.

### Added

- **Games** — multi-game support: admin creates games with a
  draft/open/locked/finished lifecycle, all v1 data preserved as the first
  game (US-26 to US-28)
- **Draft games** — prepare a new game in `draft` while another is still
  active, with a "Draft" badge in the admin game list (US-38)
- **Multiple open games** — more than one game can be open or locked at the
  same time; the public selector lists every open game (US-42)
- **Join without login** — visitors self-register by display name and manage
  their own predictions per device; re-join the next game after one finishes
  (US-29 to US-31, US-34)
- **Multiple entries** — a player can join the same open game with several
  entries and switch between them; each entry counts toward the prize pool
  (US-41)
- **Finish button** — players confirm their predictions with an explicit
  Finish action (US-35)
- **Prize pool** — admin sets game cost and commission; prize pool totals are
  calculated per game (US-36)
- **Public game views** — Leaderboard/Matches tabs, finished-game archive
  selector, and per-match prediction breakdowns with winner highlight
  (US-32, US-33)

### Changed

- **BREAKING** — schema migration adds `game_id` to matches, users, and
  settings; display names are now unique per game
- **Locks for finished games** — match management, the predictions grid, and
  user management are read-only once a game is finished; fixtures also lock
  once a game has started (US-37, US-39, US-40)

## [1.0.0] - 2026-06-12

First release. Covers all 25 user stories (US-01 to US-25).

### Added

- **Leaderboard** — public leaderboard ranked by points with tie-breaking,
  click-to-view predictions per user, smart refresh, and mobile-friendly
  layout (US-01 to US-04)
- **Auth** — admin login/logout with JWT-protected admin routes
  (US-05 to US-07)
- **Matches** — admin CRUD for matches and setting match results
  (US-08 to US-11)
- **Users** — admin CRUD for users, phone number field, auto-suffix for
  duplicate display names (US-12 to US-14, US-24, US-25)
- **Bulk add** — bulk add users, optionally with predictions in one step
  (US-22, US-23)
- **Predictions** — set/edit per-user predictions and a grid overview of all
  predictions (US-15, US-16)
- **Scoring** — automatic point calculation when results are set, with
  per-user points summary (US-17, US-18)
- **Admin dashboard** — overview with summary stats (US-19)
- **Prize & rules** — admin-managed prize and rules content displayed on the
  homepage (US-20, US-21)

[2.1.0]: https://github.com/nawang4mail/prediction-game/releases/tag/v2.1.0
[2.0.0]: https://github.com/nawang4mail/prediction-game/releases/tag/v2.0.0
[1.0.0]: https://github.com/nawang4mail/prediction-game/releases/tag/v1.0.0
