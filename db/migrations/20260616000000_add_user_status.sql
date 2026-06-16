-- Migration: 20260616000000_add_user_status.sql
-- US-65: each user/entry gains an approval status with an optional message shown
-- to the participant. Admin-added users default to 'approved'; self-joined
-- participants are set to 'declined' with a message by the join flow.

-- ======== UP ========

ALTER TABLE users
    ADD COLUMN status ENUM('approved','declined') NOT NULL DEFAULT 'approved' AFTER phone,
    ADD COLUMN status_message TEXT NULL AFTER status;

-- ======== DOWN ========

-- ALTER TABLE users DROP COLUMN status_message, DROP COLUMN status;
