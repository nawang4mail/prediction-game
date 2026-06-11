-- ======== UP ========
ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT NULL AFTER display_name;

-- ======== DOWN ========
ALTER TABLE users DROP COLUMN phone;
