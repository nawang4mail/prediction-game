import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../db/migrations');

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

await conn.execute(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id         INT          NOT NULL AUTO_INCREMENT,
    filename   VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  )
`);

const [applied] = await conn.execute('SELECT filename FROM _migrations');
const appliedSet = new Set(applied.map((r) => r.filename));

const files = (await readdir(MIGRATIONS_DIR))
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`  skip  ${file}`);
    continue;
  }
  const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
  const up = sql.split('-- ======== DOWN ========')[0].replace('-- ======== UP ========', '');
  await conn.query(up);
  await conn.execute('INSERT INTO _migrations (filename) VALUES (?)', [file]);
  console.log(`  apply ${file}`);
}

await conn.end();
console.log('Migrations complete.');
