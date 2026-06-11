-- Migration: 20260611000002_create_matches_table.sql

-- ======== UP ========

CREATE TABLE IF NOT EXISTS matches (
    id          INT           NOT NULL AUTO_INCREMENT,
    team_a      VARCHAR(100)  NOT NULL,
    team_b      VARCHAR(100)  NOT NULL,
    label       VARCHAR(150)      NULL,
    match_date  DATETIME          NULL,
    result      ENUM('team_a', 'team_b', 'draw') NULL DEFAULT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== DOWN ========

-- DROP TABLE IF EXISTS matches;
