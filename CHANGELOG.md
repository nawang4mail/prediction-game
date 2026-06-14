# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-06-14

### Changed

- **Matches** — removed the 10-match-per-game cap; admins can now add an
  unlimited number of matches to a game (US-43)

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
