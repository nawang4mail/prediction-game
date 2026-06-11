# World Cup 2026 Prediction Game

A real-time leaderboard app where players predict the outcomes of World Cup matches. An admin manages fixtures, players, and results through a protected panel — correct predictions earn points and the leaderboard updates automatically.

![Leaderboard](https://img.shields.io/badge/status-in%20development-yellow)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![React](https://img.shields.io/badge/react-19-blue)
![MySQL](https://img.shields.io/badge/mysql-8.0-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Set up environment variables](#2-set-up-environment-variables)
  - [3. Provision the database](#3-provision-the-database)
  - [4. Run migrations](#4-run-migrations)
  - [5. Seed the admin account](#5-seed-the-admin-account)
  - [6. Start the development servers](#6-start-the-development-servers)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Git Workflow](#git-workflow)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Public leaderboard** — ranked by correct predictions, auto-refreshes every 15 seconds
- **Hover / tap to inspect** — expand any player's row to see all their picks and outcomes
- **Mobile-first** — responsive Tailwind layout, works on 375 px and up
- **Admin panel** — password-protected panel to manage matches, players, and predictions
- **Auto-scoring** — points recalculate automatically when a match result is set
- **Tie-aware ranking** — players with equal points share the same rank

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Tailwind CSS 3, Vite |
| Backend | Node.js, Express 4 |
| Database | MySQL 8.0 |
| Auth | JSON Web Tokens (jsonwebtoken), bcryptjs |
| HTTP Client | Axios |

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| MySQL | 8.0 | `mysql --version` |
| Git | 2.x | `git --version` |

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd prediction-game
```

### 2. Set up environment variables

Copy the example file and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

See [Environment Variables](#environment-variables) for a description of each key.

### 3. Provision the database

Run the following SQL once in MySQL Workbench or any MySQL client as `root`:

```sql
CREATE DATABASE IF NOT EXISTS prediction_game
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- App user (read/write only)
CREATE USER IF NOT EXISTS 'pg_app'@'localhost' IDENTIFIED BY 'your_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON prediction_game.* TO 'pg_app'@'localhost';

-- Migration user (DDL access)
CREATE USER IF NOT EXISTS 'pg_migrate'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON prediction_game.* TO 'pg_migrate'@'localhost';

FLUSH PRIVILEGES;
```

### 4. Run migrations

```bash
cd server
npm install
npm run migrate
```

Expected output:

```
  apply 20260611000001_create_admins_table.sql
  apply 20260611000002_create_matches_table.sql
  apply 20260611000003_create_users_table.sql
  apply 20260611000004_create_predictions_table.sql
  apply 20260611000005_add_idx_matches_result.sql
Migrations complete.
```

### 5. Seed the admin account

Generate a bcrypt hash for your admin password:

```bash
node -e "const b = require('bcryptjs'); console.log(b.hashSync('YOUR_PASSWORD', 12));"
```

Paste the output hash into `db/seeds/001_admin_seed.sql`, replacing `$2b$12$REPLACE_WITH_REAL_BCRYPT_HASH`. Then run:

```bash
npm run seed
```

### 6. Start the development servers

Open two terminal tabs:

**Terminal 1 — API server:**

```bash
cd server
npm run dev
# Server running on http://localhost:4000
```

**Terminal 2 — Frontend:**

```bash
cd client
npm install
npm run dev
# App running on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

### `server/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | Port the Express server listens on |
| `DB_HOST` | Yes | — | MySQL host (`localhost` or IP) |
| `DB_PORT` | No | `3306` | MySQL port |
| `DB_NAME` | Yes | — | Database name |
| `DB_USER` | Yes | — | App database user (DML only) |
| `DB_PASSWORD` | Yes | — | App database password |
| `DB_MIGRATE_USER` | No | `DB_USER` | Migration user (DDL access) |
| `DB_MIGRATE_PASSWORD` | No | `DB_PASSWORD` | Migration user password |
| `JWT_SECRET` | Yes | — | Secret key for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `8h` | JWT expiry duration |

### `client/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `/api` | API base URL (only needed for non-proxied deploys) |

> **Never commit `.env` files.** They are listed in `.gitignore`.

---

## Project Structure

```
prediction-game/
├── client/                        # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/             # AdminLayout, ProtectedRoute
│   │   │   └── leaderboard/       # Leaderboard, LeaderboardRow, PredictionDetail
│   │   ├── context/               # AuthContext (JWT state)
│   │   ├── hooks/                 # useLeaderboard (polling hook)
│   │   ├── pages/
│   │   │   ├── HomePage.jsx       # Public leaderboard
│   │   │   └── admin/             # Login, Dashboard, Matches, Users, Predictions
│   │   └── services/api.js        # Axios instance with auth header
│   └── vite.config.js             # Dev proxy → localhost:4000
│
├── server/                        # Node.js / Express API
│   ├── scripts/
│   │   ├── migrate.js             # Applies pending SQL migrations
│   │   └── seed.js                # Runs seed SQL files
│   └── src/
│       ├── config/db.js           # MySQL connection pool
│       ├── controllers/           # Request handlers
│       │   ├── admin/             # auth, matches, users, predictions
│       │   └── leaderboardController.js
│       ├── middleware/
│       │   ├── auth.js            # JWT verification
│       │   └── errorHandler.js    # Global error handler
│       ├── models/                # SQL query functions
│       └── routes/                # Express routers
│
├── db/
│   ├── migrations/                # Versioned SQL files (UP + DOWN)
│   ├── seeds/                     # Initial data (admin account)
│   └── database-requirements.md  # Full schema & ERD documentation
│
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
├── CLAUDE.md                      # AI assistant conventions & git workflow
└── user story.md                  # All 18 user stories with acceptance criteria
```

---

## API Reference

All admin endpoints require an `Authorization: Bearer <token>` header.

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/leaderboard` | Ranked leaderboard with total points |
| `GET` | `/api/leaderboard/:userId/predictions` | All predictions for a player |

### Admin — Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/auth/login` | Login and receive a JWT |

**Login request body:**
```json
{ "username": "admin", "password": "your_password" }
```

### Admin — Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/matches` | List all matches |
| `POST` | `/api/admin/matches` | Add a match (max 10) |
| `PUT` | `/api/admin/matches/:id` | Update match details or set result |
| `DELETE` | `/api/admin/matches/:id` | Delete a match |

### Admin — Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | List all players |
| `POST` | `/api/admin/users` | Add a player |
| `PUT` | `/api/admin/users/:id` | Update display name |
| `DELETE` | `/api/admin/users/:id` | Remove a player |

### Admin — Predictions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/predictions` | All predictions (grid view) |
| `POST` | `/api/admin/predictions` | Set or update a prediction |
| `DELETE` | `/api/admin/predictions/:userId/:matchId` | Remove a prediction |

**Prediction values:** `team_a` · `team_b` · `draw`

---

## Database Schema

```
admins        — admin credentials (single row)
matches       — fixtures with optional result (team_a / team_b / draw / NULL)
users         — leaderboard participants
predictions   — one row per user per match (UNIQUE constraint)
_migrations   — applied migration log (managed by migrate.js)
```

Full schema, ERD (Mermaid diagram), index definitions, and migration strategy are documented in [`db/database-requirements.md`](db/database-requirements.md).

---

## Git Workflow

This project follows **GitFlow**:

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only |
| `develop` | Integration branch — all features merge here |
| `feature/US-XX-*` | One branch per user story |
| `hotfix/*` | Emergency fixes branched from `main` |

**Commit format** (Conventional Commits):

```
feat(leaderboard): add real-time polling
fix(scoring): recalculate points on prediction edit

Closes US-02
```

See [`CLAUDE.md`](CLAUDE.md) for the full branching, commit, and PR conventions.

---

## Contributing

1. Branch off `develop`: `git checkout -b feature/US-XX-description develop`
2. Make your changes with commits following the [Conventional Commits](https://www.conventionalcommits.org/) format
3. Open a PR to `develop` using the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
4. PRs require a linked user story (`Closes US-XX`) and passing CI

---

## License

This project is licensed under the [MIT License](LICENSE).
