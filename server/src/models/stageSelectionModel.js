import pool from '../config/db.js';

// All of a participant's bracket picks, as { stage_team_id, stage_id } rows so
// the client can group them by stage.
export const findByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT ss.stage_team_id, st.stage_id
     FROM stage_selections ss
     JOIN stage_teams st ON st.id = ss.stage_team_id
     WHERE ss.user_id = ?`,
    [userId]
  );
  return rows;
};

// Replaces a participant's picks for one stage. Deletes their current picks for
// teams in that stage, then inserts the new ones, in a transaction.
export const replaceForStage = async (userId, stageId, teamIds) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `DELETE ss FROM stage_selections ss
       JOIN stage_teams st ON st.id = ss.stage_team_id
       WHERE ss.user_id = ? AND st.stage_id = ?`,
      [userId, stageId]
    );
    for (const teamId of teamIds) {
      await conn.query('INSERT INTO stage_selections (user_id, stage_team_id) VALUES (?, ?)', [
        userId,
        teamId,
      ]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
