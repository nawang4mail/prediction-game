-- Migration: 20260611000004_create_predictions_table.sql

-- ======== UP ========

CREATE TABLE IF NOT EXISTS predictions (
    id         INT       NOT NULL AUTO_INCREMENT,
    user_id    INT       NOT NULL,
    match_id   INT       NOT NULL,
    prediction ENUM('team_a', 'team_b', 'draw') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_predictions_user_match (user_id, match_id),
    KEY idx_predictions_match_id (match_id),

    CONSTRAINT fk_predictions_user
        FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_predictions_match
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== DOWN ========

-- DROP TABLE IF EXISTS predictions;
