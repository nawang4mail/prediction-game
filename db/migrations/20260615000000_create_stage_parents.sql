-- Migration: 20260615000000_create_stage_parents.sql
-- US-52: stages can be combined. A combined stage links to one or more parent
-- stages; its team pool is the union of its parents' teams, and each player only
-- picks from the teams they advanced in those parents.

-- ======== UP ========

CREATE TABLE IF NOT EXISTS stage_parents (
    id              INT NOT NULL AUTO_INCREMENT,
    stage_id        INT NOT NULL,
    parent_stage_id INT NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_stage_parent (stage_id, parent_stage_id),
    CONSTRAINT fk_sp_stage  FOREIGN KEY (stage_id)        REFERENCES bracket_stages(id) ON DELETE CASCADE,
    CONSTRAINT fk_sp_parent FOREIGN KEY (parent_stage_id) REFERENCES bracket_stages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== DOWN ========

-- DROP TABLE IF EXISTS stage_parents;
