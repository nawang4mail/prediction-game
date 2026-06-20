import pool from '../config/db.js';

// Reference list of teams (countries/clubs). full_name is the canonical string
// stored in matches.team_a/team_b and stage_teams.name; validation and icon
// lookup key off it. (US-114)
export const findAll = async () => {
  const [rows] = await pool.query(
    'SELECT id, full_name, short_name, type, icon FROM teams ORDER BY type ASC, full_name ASC'
  );
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM teams WHERE id = ?', [id]);
  return rows[0] ?? null;
};

// Given a list of team names, returns the ones that are NOT in the teams table.
// Used to validate matches/stage teams on write. Comparison is case-insensitive
// on the trimmed name to match how names are typically entered.
export const findMissing = async (names) => {
  const unique = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];
  if (!unique.length) return [];
  const [rows] = await pool.query(
    'SELECT full_name FROM teams WHERE full_name IN (?)',
    [unique]
  );
  const present = new Set(rows.map((r) => r.full_name.toLowerCase()));
  return unique.filter((n) => !present.has(n.toLowerCase()));
};

export const create = async ({ full_name, short_name, type = 'country', icon = null }) => {
  const [res] = await pool.query(
    'INSERT INTO teams (full_name, short_name, type, icon) VALUES (?, ?, ?, ?)',
    [full_name, short_name, type, icon]
  );
  return res.insertId;
};

export const update = async (id, { full_name, short_name, type, icon }) => {
  await pool.query(
    'UPDATE teams SET full_name = ?, short_name = ?, type = ?, icon = ? WHERE id = ?',
    [full_name, short_name, type, icon, id]
  );
};

export const remove = async (id) => {
  const [res] = await pool.query('DELETE FROM teams WHERE id = ?', [id]);
  return res.affectedRows;
};

// Idempotent upsert by full_name — used by the country seed. (US-114)
export const upsertByName = async ({ full_name, short_name, type, icon }) => {
  await pool.query(
    `INSERT INTO teams (full_name, short_name, type, icon) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE short_name = VALUES(short_name), type = VALUES(type), icon = VALUES(icon)`,
    [full_name, short_name, type, icon]
  );
};
