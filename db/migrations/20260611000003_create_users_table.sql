-- Migration: 20260611000003_create_users_table.sql

-- ======== UP ========

CREATE TABLE IF NOT EXISTS users (
    id           INT          NOT NULL AUTO_INCREMENT,
    display_name VARCHAR(100) NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_display_name (display_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== DOWN ========

-- DROP TABLE IF EXISTS users;
