import * as User from '../../models/userModel.js';
import { upsert as upsertPrediction } from '../../models/predictionModel.js';

export const list = async (req, res, next) => {
  try {
    res.json(await User.findAll(req.gameId));
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { display_name, phone } = req.body;
    const result = await User.createWithAutoSuffix({
      game_id: req.gameId,
      display_name: display_name.trim(),
      phone,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const affected = await User.update(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Display name already taken' });
    }
    next(err);
  }
};

const STATUSES = ['approved', 'declined'];

// Approve or decline a user's entry; a declined entry carries a message shown to
// the participant. (US-65)
export const setStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const message = status === 'declined' ? (req.body.message ?? '').trim() || null : null;
    const affected = await User.setStatus(req.params.id, status, message);
    if (!affected) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const affected = await User.remove(req.params.id);
    if (!affected) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

export const bulkCreate = async (req, res, next) => {
  try {
    const names = (req.body.names ?? []).map((n) => n.trim()).filter(Boolean);
    const added = [];
    for (const name of names) {
      const result = await User.createWithAutoSuffix({ game_id: req.gameId, display_name: name });
      added.push(result);
    }
    res.status(201).json({ added, skipped: [] });
  } catch (err) {
    next(err);
  }
};

export const bulkCreateWithPredictions = async (req, res, next) => {
  try {
    const entries = req.body.entries ?? [];
    const added = [];
    for (const { name, predictions } of entries) {
      const trimmed = (name ?? '').trim();
      if (!trimmed) continue;
      const result = await User.createWithAutoSuffix({ game_id: req.gameId, display_name: trimmed });
      for (const [matchId, prediction] of Object.entries(predictions ?? {})) {
        if (prediction) {
          await upsertPrediction({ user_id: result.id, match_id: parseInt(matchId, 10), prediction });
        }
      }
      added.push(result);
    }
    res.status(201).json({ added, skipped: [] });
  } catch (err) {
    next(err);
  }
};
