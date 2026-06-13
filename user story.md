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

### US-01 · View Leaderboard ✅
**As a** visitor,  
**I want to** see a leaderboard showing all players ranked by total points,  
**So that** I can follow who is winning the prediction competition.

**Acceptance Criteria:**
- Displays columns: Rank, Display Name, Total Points
- Sorted descending by total points (highest first)
- Ties share the same rank number
- Visible without any login

---

### US-02 · Smart Leaderboard Updates ✅
**As a** visitor,  
**I want** the leaderboard to refresh only when the data has actually changed,  
**So that** I always see current standings without unnecessary network noise or flickering.

**Acceptance Criteria:**
- Client polls the server periodically (e.g. every 15s)
- The UI re-renders only if the returned data differs from what is currently displayed
- No full page reload required
- Server returns an ETag or last-updated timestamp so the client can detect changes cheaply

---

### US-03 · Click to See Predictions ✅
**As a** visitor,  
**I want to** click on a player's row to see their predictions,  
**So that** I can explore individual picks without accidentally triggering the panel on hover.

**Acceptance Criteria:**
- Clicking a player row expands their prediction detail panel; clicking again collapses it
- Hover has no effect — only click/tap toggles the panel
- Each prediction shows: Match name, User's pick, Actual result (if set), Correct/Incorrect indicator
- Unresolved matches show the prediction with no result yet
- Works on both desktop and touch devices

---

### US-04 · Mobile-Friendly Layout ✅
**As a** visitor on a phone,  
**I want** the leaderboard to display cleanly on a small screen,  
**So that** I can check standings on mobile without horizontal scrolling.

**Acceptance Criteria:**
- Responsive layout works on 375px–768px viewport widths
- Rank, name, and points fit in a single row without overflow
- Prediction detail panel is readable on mobile (full-width card or bottom sheet)

---

## Epic 2 — Admin Authentication

### US-05 · Admin Login ✅
**As an** admin,  
**I want to** log in with a username and password,  
**So that** only I can access the admin panel.

**Acceptance Criteria:**
- Login form with username and password fields
- Invalid credentials show an error message
- Successful login redirects to the admin dashboard
- Session persists via a JWT or server-side session cookie

---

### US-06 · Admin Logout ✅
**As an** admin,  
**I want to** log out,  
**So that** my session is ended and the panel is secured.

**Acceptance Criteria:**
- Logout button visible in the admin panel
- Session/token is invalidated on logout
- User is redirected to the login page

---

### US-07 · Protected Admin Routes ✅
**As the** system,  
**I want** all admin pages to require authentication,  
**So that** unauthenticated visitors cannot access admin features.

**Acceptance Criteria:**
- Any direct URL visit to `/admin/*` while unauthenticated redirects to the login page
- API endpoints under `/api/admin/*` return 401 without a valid token

---

## Epic 2.5 — Admin Dashboard

### US-19 · Admin Dashboard Overview ✅
**As an** admin,
**I want to** see a summary of the game's current state when I log in,
**So that** I can quickly understand how many matches, users, and predictions exist without navigating to each section.

**Acceptance Criteria:**
- Shows total number of matches added (e.g. 6 / 10)
- Shows how many matches have a result set vs pending
- Shows total number of users
- Shows total predictions recorded
- Displays a mini leaderboard (top users ranked by points)
- All stats update live from the API (no manual refresh required)

---

## Epic 3 — Match Management (Admin)

### US-08 · Add a Match ✅
**As an** admin,  
**I want to** add a match with two competing countries,  
**So that** users have matches to predict.

**Acceptance Criteria:**
- Form fields: Team A name, Team B name, Match label/date (optional)
- On save, match appears in the admin list and becomes available for predictions
- Maximum of 10 matches can be added

---

### US-09 · Edit a Match ✅
**As an** admin,  
**I want to** edit a match's details,  
**So that** I can correct mistakes before predictions are locked in.

**Acceptance Criteria:**
- Admin can update Team A name, Team B name, or label
- Changes are reflected immediately in the prediction grid

---

### US-10 · Delete a Match ✅
**As an** admin,  
**I want to** delete a match,  
**So that** I can remove a fixture that was added by mistake.

**Acceptance Criteria:**
- Confirmation prompt before deletion
- Deleting a match removes all associated predictions and scores for that match

---

### US-11 · Set Match Result ✅
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

### US-12 · Add a User ✅
**As an** admin,  
**I want to** add a user with a display name,  
**So that** they appear on the leaderboard and I can record their predictions.

**Acceptance Criteria:**
- Form field: Display Name (required, unique)
- User is created with 0 points and no predictions
- User immediately appears on the leaderboard

---

### US-22 · Bulk Add Users ✅
**As an** admin,  
**I want to** add multiple users at once by entering several names in one go,  
**So that** I don't have to submit the form repeatedly when setting up a new game.

**Acceptance Criteria:**
- Input accepts multiple display names (e.g. one per line or comma-separated)
- Each name is validated: non-empty, unique — duplicates are skipped with a warning
- All valid users are created in a single action
- A summary shows how many were added and which (if any) were skipped

---

### US-23 · Bulk Add Users with Predictions ✅
**As an** admin,  
**I want to** add multiple users and their predictions in one paste,  
**So that** I can set up an entire group of participants without navigating to the predictions grid separately.

**Acceptance Criteria:**
- Each line follows the format: `Name 1 2 3 1 2 ...` where numbers map to predictions per match in order:
  - `1` = Team A wins
  - `2` = Team B wins
  - `3` = Draw
  - `-` or blank = no prediction for that match
- The number of prediction codes per line can be fewer than the total matches (remaining matches left as no pick)
- On submission, users are created and predictions are saved atomically per user
- Duplicate user names are skipped with a warning (same behaviour as US-22)
- A preview table is shown before final submit, listing each user and their parsed predictions so the admin can verify before committing
- Invalid codes (anything other than 1, 2, 3, -) are highlighted as errors and block submission

---

### US-24 · User Phone Number ✅
**As an** admin,
**I want to** optionally record a phone number for each user,
**So that** I can identify participants who share the same display name.

**Acceptance Criteria:**
- Phone number field added to Add User and Edit User forms (optional, not required)
- Phone number is stored and shown in the Users table as an extra column
- Bulk Add (US-22) and Bulk Add with Predictions (US-23) do not require phone numbers — existing behaviour unchanged

---

### US-25 · Auto-Prefix Duplicate Display Names ✅
**As an** admin,
**When** I add a user whose display name already exists,
**I want** the system to automatically append a number suffix rather than rejecting the entry,
**So that** multiple participants with the same name can coexist on the leaderboard.

**Acceptance Criteria:**
- If "Alice" exists, the next "Alice" is saved as "Alice 2", the next as "Alice 3", and so on
- The suffix is determined server-side by counting existing names that start with the same base
- Applies to single Add (US-12), Bulk Add (US-22), and Bulk Add with Predictions (US-23)
- The admin sees the final saved name (with suffix) in the result/summary so there is no surprise
- Edit User (US-13) keeps the existing duplicate-rejection behaviour — renaming to an already-taken exact name still returns an error

---

### US-13 · Edit a User ✅
**As an** admin,  
**I want to** edit a user's display name,  
**So that** I can fix typos or update their name.

**Acceptance Criteria:**
- Display name can be changed
- Change reflects immediately on the leaderboard

---

### US-14 · Delete a User ✅
**As an** admin,  
**I want to** delete a user,  
**So that** I can remove someone who should no longer participate.

**Acceptance Criteria:**
- Confirmation prompt before deletion
- All of the user's predictions and points are removed
- User disappears from the leaderboard

---

## Epic 5 — Prediction Management (Admin)

### US-15 · Set / Edit a User's Prediction ✅
**As an** admin,  
**I want to** set or change a user's prediction for any match,  
**So that** I can enter or correct their choices on their behalf.

**Acceptance Criteria:**
- For each match, prediction options are: "Team A Wins", "Team B Wins", "Draw"
- Prediction can be changed at any time (even after match result is set; score recalculates)
- Saving a prediction triggers score recalculation if the match result is already set

---

### US-16 · Prediction Grid Overview ✅
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

### US-17 · Automatic Point Calculation ✅
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

### US-18 · Points Summary Per User ✅
**As the** system,  
**I want** each user's total points to be stored and served efficiently,  
**So that** the leaderboard loads quickly even with many users.

**Acceptance Criteria:**
- Total points are either computed on the fly via SQL aggregation or cached on write
- Leaderboard API response includes rank, display name, and total points
- Response time under 500ms for up to 100 users

---

## Epic 7 — Prize & Rules

### US-20 · Set Prize and Rules Content ✅
**As an** admin,  
**I want to** write a prize description and game rules from the admin panel,  
**So that** visitors on the homepage know what they are playing for and how scoring works.

**Acceptance Criteria:**
- Admin Settings page with two text areas: Prize and Rules
- Content is saved to the database and persists across page reloads
- Save button shows success/error feedback
- Content can be updated at any time

---

### US-21 · Display Prize and Rules on Homepage ✅
**As a** visitor,  
**I want to** see the prize and rules alongside the leaderboard,  
**So that** I understand the reward and the scoring system at a glance.

**Acceptance Criteria:**
- Prize and Rules panel is shown on the homepage when the admin has entered content
- On desktop (≥ 768px): panel sits side-by-side to the left of the leaderboard
- On mobile: panel stacks above the leaderboard
- If both Prize and Rules are empty, the panel is hidden entirely
- Content updates reflect immediately after admin saves

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
| Settings | `/admin/settings` | Admin only |

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

-- Admin-editable content (prize, rules)
settings (key VARCHAR PRIMARY KEY, value TEXT, updated_at)
```

---

## Out of Scope (for this version)

- Users logging in themselves to submit their own predictions
- Email notifications
- Match scheduling / countdown timers
- Historical tournaments / multiple seasons
