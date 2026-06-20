-- Migration: 20260620000000_create_teams_table.sql
-- US-114: a reference list of teams (countries and clubs). Admins may only assign
-- teams from this list when adding matches or bracket stages. Each team has a full
-- name (the canonical string stored in matches.team_a/team_b and stage_teams.name),
-- a short code, a type, and a locally-stored icon (country flag or club logo).

-- ======== UP ========

CREATE TABLE IF NOT EXISTS teams (
    id         INT          NOT NULL AUTO_INCREMENT,
    full_name  VARCHAR(100) NOT NULL,
    short_name VARCHAR(20)  NOT NULL,
    type       ENUM('country', 'club') NOT NULL DEFAULT 'country',
    icon       VARCHAR(255) NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_teams_full_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== DOWN ========

-- DROP TABLE IF EXISTS teams;
