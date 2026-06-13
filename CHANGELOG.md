# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/nawang4mail/prediction-game/releases/tag/v1.0.0
