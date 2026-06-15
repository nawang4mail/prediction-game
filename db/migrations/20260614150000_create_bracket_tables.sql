-- Migration: 20260614150000_create_bracket_tables.sql
-- US-46: Bracket Prediction games (US-45) are made of admin-defined stages, each
-- a named list of teams with a pick count, points per correct pick, and an
-- all-correct bonus. The is_winner flag on a team records the actual result and
-- is set later (US-47). Player selections reference stage_teams (added in US-48).

-- ======== UP ========

CREATE TABLE IF NOT EXISTS bracket_stages (
    id                 INT          NOT NULL AUTO_INCREMENT,
    game_id            INT          NOT NULL,
    name               VARCHAR(150) NOT NULL,
    pick_count         INT          NOT NULL,
    points_per_correct INT          NOT NULL,
    all_correct_bonus  INT          NOT NULL DEFAULT 0,
    sort_order         INT          NOT NULL DEFAULT 0,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_stages_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stage_teams (
    id         INT          NOT NULL AUTO_INCREMENT,
    stage_id   INT          NOT NULL,
    name       VARCHAR(100) NOT NULL,
    is_winner  BOOLEAN      NOT NULL DEFAULT 0,
    sort_order INT          NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    UNIQUE KEY uq_stage_team_name (stage_id, name),
    CONSTRAINT fk_stage_teams_stage FOREIGN KEY (stage_id) REFERENCES bracket_stages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== DOWN ========

-- DROP TABLE IF EXISTS stage_teams;
-- DROP TABLE IF EXISTS bracket_stages;
