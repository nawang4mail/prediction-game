-- Migration: 20260614130000_create_prize_tiers_table.sql
-- US-36: per-game prize tiers. Each tier takes a percentage of the prize pool
-- (total collected minus commission). Entry cost and commission percentage are
-- stored as per-game settings keys, so no schema change is needed for them.

-- ======== UP ========

CREATE TABLE IF NOT EXISTS prize_tiers (
    id         INT          NOT NULL AUTO_INCREMENT,
    game_id    INT          NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    label      VARCHAR(100) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    KEY idx_prize_tiers_game (game_id),
    CONSTRAINT fk_prize_tiers_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== DOWN ========

-- DROP TABLE IF EXISTS prize_tiers;
