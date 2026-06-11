# World Cup Prediction Game — User Stories

## Context

A web application where an admin manages a set of 10 World Cup matches and user predictions. Visitors see a public leaderboard ranked by points. Each correct prediction earns 1 point (max 10). The admin panel is password-protected and handles all data entry (users, matches, predictions, results).

**Stack:** React (mobile-friendly, Tailwind CSS) + Node.js/Express REST API + MySQL  
**Deliverable:** User stories document (build phase follows separately)

---

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Anyone who opens the app — no login required |
| **Admin** | Single privileged user who manages everything via a protected panel |

---

## Epic 1 — Public Leaderboard

### US-01 · View Leaderboard
**As a** visitor,  
**I want to** see a leaderboard showing all players ranked by total points,  
**So that** I can follow who is winning the prediction competition.

**Acceptance Criteria:**
- Displays columns: Rank, Display Name, Total Points
- Sorted descending by total points (highest first)
- Ties share the same rank number
- Visible without any login

---

### US-02 · Real-Time Updates
**As a** visitor,  
**I want** the leaderboard to automatically refresh when scores change,  
**So that** I always see current standings without manually reloading.

**Acceptance Criteria:**
- Leaderboard polls or uses server-sent events to detect score changes
- Re-sorts and re-renders in place when updated
- No full page reload required

---

### US-03 · Hover / Tap to See Predictions
**As a** visitor,  
**I want to** hover over (desktop) or tap (mobile) a player's row,  
**So that** I can see all their predictions and which ones were correct.

**Acceptance Criteria:**
- Shows a tooltip or expanded row with all 10 match predictions
- Each prediction shows: Match name, User's pick, Actual result (if set), Correct/Incorrect indicator
- Unresolved matches show prediction with no result yet
- Works on touch devices (tap to toggle open/close)

---

### US-04 · Mobile-Friendly Layout
**As a** visitor on a phone,  
**I want** the leaderboard to display cleanly on a small screen,  
**So that** I can check standings on mobile without horizontal scrolling.

**Acceptance Criteria:**
- Responsive layout works on 375px–768px viewport widths
- Rank, name, and points fit in a single row without overflow
- Prediction detail panel is readable on mobile (full-width card or bottom sheet)

---

## Epic 2 — Admin Authentication

### US-05 · Admin Login
**As an** admin,  
**I want to** log in with a username and password,  
**So that** only I can access the admin panel.

**Acceptance Criteria:**
- Login form with username and password fields
- Invalid credentials show an error message
- Successful login redirects to the admin dashboard
- Session persists via a JWT or server-side session cookie

---

### US-06 · Admin Logout
**As an** admin,  
**I want to** log out,  
**So that** my session is ended and the panel is secured.

**Acceptance Criteria:**
- Logout button visible in the admin panel
- Session/token is invalidated on logout
- User is redirected to the login page

---

### US-07 · Protected Admin Routes
**As the** system,  
**I want** all admin pages to require authentication,  
**So that** unauthenticated visitors cannot access admin features.

**Acceptance Criteria:**
- Any direct URL visit to `/admin/*` while unauthenticated redirects to the login page
- API endpoints under `/api/admin/*` return 401 without a valid token

---

## Epic 3 — Match Management (Admin)

### US-08 · Add a Match
**As an** admin,  
**I want to** add a match with two competing countries,  
**So that** users have matches to predict.

**Acceptance Criteria:**
- Form fields: Team A name, Team B name, Match label/date (optional)
- On save, match appears in the admin list and becomes available for predictions
- Maximum of 10 matches can be added

---

### US-09 · Edit a Match
**As an** admin,  
**I want to** edit a match's details,  
**So that** I can correct mistakes before predictions are locked in.

**Acceptance Criteria:**
- Admin can update Team A name, Team B name, or label
- Changes are reflected immediately in the prediction grid

---

### US-10 · Delete a Match
**As an** admin,  
**I want to** delete a match,  
**So that** I can remove a fixture that was added by mistake.

**Acceptance Criteria:**
- Confirmation prompt before deletion
- Deleting a match removes all associated predictions and scores for that match

---

### US-11 · Set Match Result
**As an** admin,  
**I want to** set the official result for a completed match (Team A wins / Team B wins / Draw),  
**So that** the system can automatically calculate points for all users.

**Acceptance Criteria:**
- Dropdown to select result: "Team A Wins", "Team B Wins", "Draw"
- On save, points are recalculated for all users automatically
- Leaderboard reflects updated scores immediately
- Result can be changed (e.g. to correct an error) and scores will recalculate

---

## Epic 4 — User Management (Admin)

### US-12 · Add a User
**As an** admin,  
**I want to** add a user with a display name,  
**So that** they appear on the leaderboard and I can record their predictions.

**Acceptance Criteria:**
- Form field: Display Name (required, unique)
- User is created with 0 points and no predictions
- User immediately appears on the leaderboard

---

### US-13 · Edit a User
**As an** admin,  
**I want to** edit a user's display name,  
**So that** I can fix typos or update their name.

**Acceptance Criteria:**
- Display name can be changed
- Change reflects immediately on the leaderboard

---

### US-14 · Delete a User
**As an** admin,  
**I want to** delete a user,  
**So that** I can remove someone who should no longer participate.

**Acceptance Criteria:**
- Confirmation prompt before deletion
- All of the user's predictions and points are removed
- User disappears from the leaderboard

---

## Epic 5 — Prediction Management (Admin)

### US-15 · Set / Edit a User's Prediction
**As an** admin,  
**I want to** set or change a user's prediction for any match,  
**So that** I can enter or correct their choices on their behalf.

**Acceptance Criteria:**
- For each match, prediction options are: "Team A Wins", "Team B Wins", "Draw"
- Prediction can be changed at any time (even after match result is set; score recalculates)
- Saving a prediction triggers score recalculation if the match result is already set

---

### US-16 · Prediction Grid Overview
**As an** admin,  
**I want to** see all users and all their predictions in a single grid/table,  
**So that** I can review and edit everything efficiently without navigating user-by-user.

**Acceptance Criteria:**
- Grid with rows = users, columns = matches
- Each cell shows the user's prediction (or empty if not set)
- Cells are editable inline or via a quick-edit control
- Match results (if set) are shown in the column header or sub-header
- Correct predictions are visually highlighted (e.g. green cell)

---

## Epic 6 — Scoring System

### US-17 · Automatic Point Calculation
**As the** system,  
**When** an admin sets or changes a match result,  
**I want** points to be recalculated automatically for all users,  
**So that** scores are always accurate without manual entry.

**Acceptance Criteria:**
- A user earns 1 point for each match where their prediction matches the official result
- Total points = count of correct predictions across all matches (max 10)
- Recalculation triggers on: result set, result changed, prediction changed (if result exists)
- Zero points if no prediction was recorded for a match

---

### US-18 · Points Summary Per User
**As the** system,  
**I want** each user's total points to be stored and served efficiently,  
**So that** the leaderboard loads quickly even with many users.

**Acceptance Criteria:**
- Total points are either computed on the fly via SQL aggregation or cached on write
- Leaderboard API response includes rank, display name, and total points
- Response time under 500ms for up to 100 users

---

## Navigation & Tabs

| Tab | Route | Access |
|-----|-------|--------|
| Leaderboard | `/` | Public |
| Admin Login | `/admin/login` | Public |
| Admin Dashboard | `/admin` | Admin only |
| Match Management | `/admin/matches` | Admin only |
| User Management | `/admin/users` | Admin only |
| Predictions Grid | `/admin/predictions` | Admin only |

---

## MySQL Schema (Draft)

```sql
-- Admin account (single row)
admins (id, username, password_hash)

-- Matches / fixtures
matches (id, team_a, team_b, label, result ENUM('team_a','team_b','draw',NULL), created_at)

-- Participants on the leaderboard
users (id, display_name, created_at)

-- Each user's prediction per match
predictions (id, user_id FK, match_id FK, prediction ENUM('team_a','team_b','draw'), UNIQUE(user_id, match_id))

-- Derived: total points per user (computed via SQL COUNT or maintained column)
```

---

## Out of Scope (for this version)

- Users logging in themselves to submit their own predictions
- Email notifications
- Match scheduling / countdown timers
- Historical tournaments / multiple seasons
