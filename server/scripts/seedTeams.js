import 'dotenv/config';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Seeds the teams table with every country (US-114): downloads each flag from
// flagcdn.com into server/public/icons and upserts a country row. Idempotent —
// safe to re-run. Run with: npm run seed:teams
const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../public/icons');
const FLAG = (iso2) => `https://flagcdn.com/w160/${iso2}.png`;

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const countries = JSON.parse(await readFile(join(__dirname, 'data/countries.json'), 'utf8'));
await mkdir(ICONS_DIR, { recursive: true });

let ok = 0;
let noIcon = 0;
for (const { name, iso2, iso3 } of countries) {
  let icon = null;
  try {
    const res = await fetch(FLAG(iso2));
    if (res.ok) {
      await writeFile(join(ICONS_DIR, `${iso2}.png`), Buffer.from(await res.arrayBuffer()));
      icon = `/icons/${iso2}.png`;
    } else {
      noIcon++;
    }
  } catch {
    noIcon++;
  }
  await conn.query(
    `INSERT INTO teams (full_name, short_name, type, icon) VALUES (?, ?, 'country', ?)
     ON DUPLICATE KEY UPDATE short_name = VALUES(short_name), type = VALUES(type), icon = VALUES(icon)`,
    [name, iso3, icon]
  );
  ok++;
}

await conn.end();
console.log(`Seeded ${ok} countries (${noIcon} without a downloadable flag).`);
