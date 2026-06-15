-- Migration: 20260614160000_create_stage_selections.sql
-- US-48: a participant's bracket picks. Each row is one team a player selected
-- in a stage; a player picks exactly the stage's pick_count teams. Cascades on
-- both the user and the team so deleting either clears the picks.

-- ======== UP ========

CREATE TABLE IF NOT EXISTS stage_selections (
    id            INT       NOT NULL AUTO_INCREMENT,
    user_id       INT       NOT NULL,
    stage_team_id INT       NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_user_stage_team (user_id, stage_team_id),
    CONSTRAINT fk_sel_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sel_team FOREIGN KEY (stage_team_id) REFERENCES stage_teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== DOWN ========

-- DROP TABLE IF EXISTS stage_selections;
