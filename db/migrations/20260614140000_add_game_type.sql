-- Migration: 20260614140000_add_game_type.sql
-- US-45: games gain a type. Every existing game is the original match-winner
-- format, so the column defaults to 'guess_winners'. A new 'bracket_prediction'
-- type is introduced for the FIFA-style bracket challenge (US-46 to US-49).

-- ======== UP ========

ALTER TABLE games
    ADD COLUMN type ENUM('guess_winners','bracket_prediction')
        NOT NULL DEFAULT 'guess_winners' AFTER name;

-- ======== DOWN ========

-- ALTER TABLE games DROP COLUMN type;
