import { randomUUID } from 'crypto';
import * as User from '../models/userModel.js';
import * as Game from '../models/gameModel.js';
import * as Match from '../models/matchModel.js';
import * as Stage from '../models/bracketStageModel.js';
import * as Selection from '../models/stageSelectionModel.js';
import { getAll as getSettings } from '../models/settingsModel.js';
import { upsert, remove, findByUser } from '../models/predictionModel.js';

const PREDICTIONS = ['team_a', 'team_b', 'draw'];
const DEFAULT_FINISH_MESSAGE = 'Game set — your predictions are saved. Good luck!';

// Maps each stage id to the set of team NAMES a participant picked in it.
const pickedNamesByStage = (stages, selections) => {
  const nameById = new Map();
  for (const s of stages) for (const t of s.teams) nameById.set(t.id, t.name);
  const byStage = new Map();
  for (const sel of selections) {
    const name = nameById.get(sel.stage_team_id);
    if (!name) continue;
    if (!byStage.has(sel.stage_id)) byStage.set(sel.stage_id, new Set());
    byStage.get(sel.stage_id).add(name);
  }
  return byStage;
};

// Union of the team names a participant advanced across the given parent stages.
const unionNames = (byStage, parentIds) => {
  const out = new Set();
  for (const pid of parentIds) for (const n of byStage.get(pid) ?? []) out.add(n);
  return out;
};

export const join = async (req, res, next) => {
  try {
    const display_name = (req.body.display_name ?? '').trim();
    if (!display_name) return res.status(400).json({ message: 'Display name is required' });

    // A specific game can be chosen (several may be open at once); otherwise
    // fall back to the most recently opened game. (US-42)
    const game = req.body.game_id
      ? await Game.findById(req.body.game_id)
      : await Game.findActive();
    if (!game || game.status !== 'open') {
      return res.status(403).json({ message: 'That game is not open for joining right now' });
    }

    const entry_token = randomUUID();
    const result = await User.createWithAutoSuffix({
      game_id: game.id,
      display_name,
      phone: req.body.phone,
      entry_token,
    });
    res.status(201).json({ ...result, entry_token, game: { id: game.id, name: game.name } });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const base = {
      participant: { id: req.participant.id, display_name: req.participant.display_name },
      game: { id: req.game.id, name: req.game.name, status: req.game.status, type: req.game.type },
    };

    if (req.game.type === 'bracket_prediction') {
      // Hide which teams actually won until the game is finished, so picks aren't
      // influenced by results mid-tournament.
      const reveal = req.game.status === 'finished';
      const rawStages = await Stage.findByGame(req.game.id);
      const selections = await Selection.findByUser(req.participant.id);

      // Return the full team pool (plus parent_ids) for every stage. The client
      // computes a combined stage's available teams from the player's own picks so
      // the prediction wizard can update live before anything is saved (US-52, US-56).
      const stages = rawStages.map((s) => ({
        ...s,
        teams: s.teams.map((t) => ({ ...t, is_winner: reveal ? t.is_winner : 0 })),
      }));
      return res.json({ ...base, predictions: [], stages, selections });
    }

    res.json({ ...base, predictions: await findByUser(req.participant.id) });
  } catch (err) {
    next(err);
  }
};

export const savePrediction = async (req, res, next) => {
  try {
    if (req.game.status !== 'open') {
      return res.status(403).json({ message: 'The game has started — predictions are locked' });
    }

    const { match_id, prediction } = req.body;
    const match = await Match.findById(match_id);
    if (!match || match.game_id !== req.participant.game_id) {
      return res.status(404).json({ message: 'Match not found in your game' });
    }

    if (!prediction) {
      await remove({ user_id: req.participant.id, match_id });
      return res.json({ message: 'Cleared' });
    }
    if (!PREDICTIONS.includes(prediction)) {
      return res.status(400).json({ message: 'Invalid prediction' });
    }
    await upsert({ user_id: req.participant.id, match_id, prediction });
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
};

// Saves a participant's picks for one bracket stage. They must choose exactly
// the stage's pick_count teams, all belonging to that stage. (US-48)
export const saveBracketPick = async (req, res, next) => {
  try {
    if (req.game.status !== 'open') {
      return res.status(403).json({ message: 'The game has started — predictions are locked' });
    }
    if (req.game.type !== 'bracket_prediction') {
      return res.status(400).json({ message: 'This game does not use brackets' });
    }
    const stages = await Stage.findByGame(req.game.id);
    const stage = stages.find((s) => s.id === Number(req.body.stage_id));
    if (!stage) return res.status(404).json({ message: 'Stage not found in your game' });

    // For a combined stage, a player may only pick teams they advanced from its
    // parents (US-52); a source stage allows any of its teams.
    let validIds;
    if (stage.parent_ids?.length) {
      const selections = await Selection.findByUser(req.participant.id);
      const advanced = unionNames(pickedNamesByStage(stages, selections), stage.parent_ids);
      validIds = new Set(stage.teams.filter((t) => advanced.has(t.name)).map((t) => t.id));
    } else {
      validIds = new Set(stage.teams.map((t) => t.id));
    }
    const teamIds = [
      ...new Set(
        (Array.isArray(req.body.team_ids) ? req.body.team_ids : [])
          .map(Number)
          .filter((id) => validIds.has(id))
      ),
    ];
    if (teamIds.length !== stage.pick_count) {
      return res.status(400).json({ message: `Pick exactly ${stage.pick_count} team(s) for this stage` });
    }

    await Selection.replaceForStage(req.participant.id, stage.id, teamIds);
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
};

// Confirms a participant has finished entering predictions and returns the
// admin-configured confirmation message (or a sensible default). Predictions
// already save as they are picked, so this is a confirmation, not a lock. (US-35)
export const finish = async (req, res, next) => {
  try {
    if (req.game.status !== 'open') {
      return res.status(403).json({ message: 'The game has started — predictions are locked' });
    }
    const settings = await getSettings(req.game.id);
    const message = settings.finish_message?.trim() || DEFAULT_FINISH_MESSAGE;
    res.json({ message });
  } catch (err) {
    next(err);
  }
};
