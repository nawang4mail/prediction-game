# CLAUDE.md — World Cup Prediction Game

This file instructs Claude on how to work within this repository. Follow all rules below for every task in this project.

---

## Project Overview

A World Cup prediction game with a public leaderboard and a protected admin panel.  
Stack: **React** (Tailwind CSS) + **Node.js/Express** REST API + **MySQL**  
User stories: see `user story.md`

---

## Repository Structure

```
prediction-game/
├── client/          # React frontend (Vite + Tailwind)
├── server/          # Node.js/Express API
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── middleware/
├── db/
│   ├── migrations/  # SQL migration files
│   └── seeds/       # Seed data
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
├── user story.md
└── CLAUDE.md
```

---

## Branching Strategy (GitFlow)

### Permanent branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only. Never commit directly. |
| `develop` | Integration branch. All feature branches merge here first. |

### Short-lived branches

| Branch type | Pattern | Example |
|-------------|---------|---------|
| Feature | `feature/US-XX-short-description` | `feature/US-01-leaderboard-view` |
| Bug fix | `bugfix/US-XX-short-description` | `bugfix/US-17-score-recalculation` |
| Hot fix | `hotfix/short-description` | `hotfix/admin-login-crash` |
| Release | `release/vX.X.X` | `release/v1.0.0` |
| Chore | `chore/short-description` | `chore/setup-eslint` |

### Rules

- Always branch off `develop` for features and bugfixes.
- Branch off `main` only for hotfixes.
- Delete the branch after it is merged.
- One user story = one branch. Do not combine unrelated stories in a single branch.
- Branch names must be lowercase kebab-case. No spaces, no uppercase.

---

## Commit Message Convention (Conventional Commits)

Format:

```
<type>(<scope>): <short summary>

[optional body — explain WHY, not WHAT]

[optional footer — e.g. Closes US-01, BREAKING CHANGE: ...]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature or user story implementation |
| `fix` | A bug fix |
| `refactor` | Code change that neither adds a feature nor fixes a bug |
| `test` | Adding or updating tests |
| `docs` | Documentation only changes |
| `style` | Formatting, whitespace — no logic change |
| `chore` | Build process, dependency updates, config |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |

### Scopes (use the area of the app)

`leaderboard`, `admin`, `auth`, `matches`, `users`, `predictions`, `scoring`, `db`, `api`, `ui`

### Rules

- Summary line: max 72 characters, imperative mood, no period at the end.
- Reference the user story in the footer: `Closes US-01` or `Refs US-11`.
- Never use `git commit -m` for multi-line messages — use a HEREDOC or editor.
- Do not amend pushed commits. Create a new commit to fix mistakes.

### Examples

```
feat(leaderboard): add rank column with tie-breaking logic

Closes US-01
```

```
feat(auth): protect admin routes with JWT middleware

Unauthenticated requests to /api/admin/* now return 401.

Closes US-07
```

```
fix(scoring): recalculate points when prediction is edited after result is set

Refs US-17
```

```
chore(db): add initial migration for matches and predictions tables
```

---

## Pull Request Rules

- PRs always target `develop` (except hotfixes → `main`).
- PR title must follow the same Conventional Commits format as commit messages.
- Every PR must reference at least one user story (`Closes US-XX` or `Refs US-XX`).
- Keep PRs small and focused. One story per PR where possible.
- PRs require passing CI (lint + tests) before merge.
- Use **squash merge** when merging into `develop` to keep history clean.
- Use **merge commit** (no squash) when merging `develop` → `main` for a release.
- Delete the source branch after merge.

### PR Description Template

```markdown
## Summary
- What this PR does (1-3 bullets)

## User Story
Closes US-XX

## Test Plan
- [ ] Manual test steps listed here

## Notes
Any context reviewers need
```

---

## Versioning (Semantic Versioning)

`vMAJOR.MINOR.PATCH`

| Increment | When |
|-----------|------|
| MAJOR | Breaking change (e.g. schema change requiring data migration) |
| MINOR | New feature added (new user story completed) |
| PATCH | Bug fix or small improvement |

Tag releases on `main`: `git tag -a v1.0.0 -m "Release v1.0.0"`

---

## Development Workflow Per User Story

1. Pick the next story from `user story.md`.
2. Create a branch: `git checkout -b feature/US-XX-description develop`
3. Implement in small, logical commits following the commit convention above.
4. Write or update tests alongside the implementation.
5. Open a PR to `develop` using the PR template.
6. After merge, delete the branch.
7. Mark the story done in `user story.md` (add a `[x]` checkbox or `Status: Done` line).

---

## Code Style

- **JavaScript/React**: ESLint + Prettier, single quotes, 2-space indent, no semicolons (frontend), semicolons (backend).
- **CSS**: Tailwind utility classes only — no custom CSS files unless unavoidable.
- **SQL**: Uppercase keywords (`SELECT`, `INSERT`), snake_case table and column names.
- **API routes**: REST conventions — plural nouns, kebab-case (`/api/admin/matches`, `/api/admin/users`).
- **No commented-out code** committed to the repo. Use `git stash` or a branch instead.

---

## Environment Variables

Never commit `.env` files. Use `.env.example` to document required variables:

```
PORT=
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
JWT_SECRET=
JWT_EXPIRES_IN=
```

---

## Database Migrations

- All schema changes must go through a migration file in `db/migrations/`.
- Name format: `YYYYMMDDHHMMSS_short_description.sql`  
  Example: `20260611120000_create_matches_table.sql`
- Never alter a pushed migration. Create a new one instead.
- Run migrations in order. Document the rollback SQL in each file.

---

## What Claude Should NOT Do

- Do not commit directly to `main` or `develop`.
- Do not skip writing a migration for any database schema change.
- Do not combine multiple user stories into one branch or PR.
- Do not push `.env`, `node_modules/`, or build artifacts.
- Do not force-push to `main` or `develop` under any circumstances.
