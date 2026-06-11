import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = join(__dirname, '../../db/seeds');

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

const files = (await readdir(SEEDS_DIR)).filter((f) => f.endsWith('.sql')).sort();

for (const file of files) {
  const sql = await readFile(join(SEEDS_DIR, file), 'utf8');
  await conn.query(sql);
  console.log(`  seeded ${file}`);
}

await conn.end();
console.log('Seeding complete.');
