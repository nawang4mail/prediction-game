-- Migration: 20260615010000_add_stage_description.sql
-- US-55: stages gain an optional admin description shown to players.

-- ======== UP ========

ALTER TABLE bracket_stages
    ADD COLUMN description TEXT NULL AFTER name;

-- ======== DOWN ========

-- ALTER TABLE bracket_stages DROP COLUMN description;
