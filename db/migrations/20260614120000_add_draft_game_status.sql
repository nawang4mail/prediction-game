-- Migration: 20260614120000_add_draft_game_status.sql
-- US-38: games gain a 'draft' status so the admin can build the next game
-- (matches, prizes, settings) while the current one is still open or locked.
-- New games start as 'draft' and are invisible to participants until opened.

-- ======== UP ========

ALTER TABLE games
    MODIFY COLUMN status ENUM('draft','open','locked','finished') NOT NULL DEFAULT 'draft';

-- ======== DOWN ========

-- Any draft games must be removed or promoted before rolling back, otherwise the
-- ENUM change will fail / truncate their status.
-- DELETE FROM games WHERE status = 'draft';
-- ALTER TABLE games MODIFY COLUMN status ENUM('open','locked','finished') NOT NULL DEFAULT 'open';
