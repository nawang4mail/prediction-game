-- ======== UP ========
CREATE TABLE settings (
  `key`      VARCHAR(100) NOT NULL,
  `value`    TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`) VALUES
  ('prize_text', ''),
  ('rules_text', '');

-- ======== DOWN ========
DROP TABLE IF EXISTS settings;
