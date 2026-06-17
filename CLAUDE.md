# World Cup Prediction Game - AI Instructions

## Project Overview
A World Cup prediction game with a public leaderboard and protected admin panel.
Stack: React (Tailwind CSS) + Node.js/Express REST API + MySQL.
Reference `user story.md` for active tasks.

## Repository Structure
* `client/`: React frontend (Vite + Tailwind)
* `server/`: Node.js/Express API (`routes/`, `controllers/`, `models/`, `middleware/`)
* `db/`: `migrations/` (SQL files) and `seeds/`

## Development Rules & Git Strategy
* **Workflow:** Use strict GitFlow. `main` is production only. `develop` is the integration branch.
* **Branching:** Branch off `develop` for features/bugfixes (`feature/US-XX-desc`, `bugfix/US-XX-desc`). Branch off `main` for hotfixes. Delete branches after merging. One user story per branch.
* **Commits:** Strictly follow Conventional Commits format. Always reference the user story in the footer (e.g., `Closes US-01`).
* **Versioning:** Use strict Semantic Versioning (`vMAJOR.MINOR.PATCH`). Tag releases on `main`.
* **PRs:** Target `develop`. Require passing CI. Squash merge to `develop`, merge commit to `main`. Include a summary, test plan, and user story reference.

## Code Style & Architecture
* **Frontend:** ESLint + Prettier, single quotes, 2-space indent, no semicolons. Tailwind utility classes only.
* **Backend:** Semicolons required. REST API routing conventions (plural, kebab-case like `/api/admin/matches`).
* **Database:** SQL migrations required for all schema changes in `db/migrations/` (Format: `YYYYMMDDHHMMSS_desc.sql`). Uppercase SQL keywords, snake_case identifiers. Never alter pushed migrations.
* **General:** Never commit commented-out code. Never commit `.env` files (use `.env.example`).

## Strict Prohibitions (NEVER DO THESE)
* Do not commit directly to `main` or `develop`.
* Do not skip writing SQL migrations for schema changes.
* Do not combine multiple user stories into one branch or PR.
* Do not force-push to `main` or `develop`.