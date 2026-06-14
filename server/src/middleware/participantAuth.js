import { findByEntryToken } from '../models/userModel.js';
import { findById } from '../models/gameModel.js';

// Identifies a no-login participant by the entry token issued when joining.
export default async function participantAuth(req, res, next) {
  try {
    const token = req.headers['x-entry-token'];
    if (!token) return res.status(401).json({ message: 'Missing entry token' });
    const participant = await findByEntryToken(token);
    if (!participant) return res.status(401).json({ message: 'Unknown entry token' });
    req.participant = participant;
    req.game = await findById(participant.game_id);
    next();
  } catch (err) {
    next(err);
  }
}
