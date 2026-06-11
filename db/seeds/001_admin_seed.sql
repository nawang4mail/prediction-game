-- Seed: 001_admin_seed.sql
-- Replace the hash with: node -e "const b=require('bcryptjs');console.log(b.hashSync('YOUR_PASSWORD',12))"

INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2b$12$REPLACE_WITH_REAL_BCRYPT_HASH')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
