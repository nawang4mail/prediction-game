-- Migration: 20260612090000_add_multi_game_support.sql
-- US-26/US-27/US-28: games table; matches, users, and settings become
-- per-game. All existing v1 data is attached to an auto-created "Game 1"
-- so history survives the schema change.

-- ======== UP ========

CREATE TABLE IF NOT EXISTS games (
    id         INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    status     ENUM('open','locked','finished') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_games_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The v1 game is already underway (results exist), so it starts locked.
INSERT INTO games (name, status) VALUES ('Game 1', 'locked');
SET @gid = LAST_INSERT_ID();

ALTER TABLE matches ADD COLUMN game_id INT NULL AFTER id;
UPDATE matches SET game_id = @gid;
ALTER TABLE matches
    MODIFY game_id INT NOT NULL,
    ADD CONSTRAINT fk_matches_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE users
    ADD COLUMN game_id INT NULL AFTER id,
    ADD COLUMN entry_token CHAR(36) NULL AFTER phone;
UPDATE users SET game_id = @gid;
ALTER TABLE users
    MODIFY game_id INT NOT NULL,
    DROP KEY uq_users_display_name,
    ADD UNIQUE KEY uq_users_game_display_name (game_id, display_name),
    ADD UNIQUE KEY uq_users_entry_token (entry_token),
    ADD CONSTRAINT fk_users_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE settings ADD COLUMN game_id INT NULL FIRST;
UPDATE settings SET game_id = @gid;
ALTER TABLE settings
    MODIFY game_id INT NOT NULL,
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (game_id, `key`),
    ADD CONSTRAINT fk_settings_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

-- ======== DOWN ========

-- ALTER TABLE settings DROP FOREIGN KEY fk_settings_game, DROP PRIMARY KEY, ADD PRIMARY KEY (`key`), DROP COLUMN game_id;
-- ALTER TABLE users DROP FOREIGN KEY fk_users_game, DROP KEY uq_users_game_display_name, DROP KEY uq_users_entry_token, ADD UNIQUE KEY uq_users_display_name (display_name), DROP COLUMN game_id, DROP COLUMN entry_token;
-- ALTER TABLE matches DROP FOREIGN KEY fk_matches_game, DROP COLUMN game_id;
-- DROP TABLE IF EXISTS games;
