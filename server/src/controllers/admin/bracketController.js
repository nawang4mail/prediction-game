import * as Stage from '../../models/bracketStageModel.js';
import * as User from '../../models/userModel.js';
import * as Selection from '../../models/stageSelectionModel.js';
import * as Team from '../../models/teamModel.js';

// Validates and normalises a stage payload. A stage with parent_ids is a
// combined stage (US-52): its teams are derived from its parents, so the team
// list is not required. Returns { error } or { value }.
const parseStage = (body) => {
  const name = (body.name ?? '').trim();
  if (!name) return { error: 'Stage name is required' };

  const description = (body.description ?? '').trim() || null;

  const parent_ids = Array.isArray(body.parent_ids)
    ? [...new Set(body.parent_ids.map(Number).filter(Number.isInteger))]
    : [];
  const combined = parent_ids.length > 0;

  const pick_count = Number(body.pick_count);
  if (!Number.isInteger(pick_count) || pick_count < 1) {
    return { error: 'Pick count must be at least 1' };
  }
  const points_per_correct = Number(body.points_per_correct);
  if (!Number.isInteger(points_per_correct) || points_per_correct < 1) {
    return { error: 'Points per correct must be at least 1' };
  }
  const all_correct_bonus = Number(body.all_correct_bonus ?? 0);
  if (!Number.isInteger(all_correct_bonus) || all_correct_bonus < 0) {
    return { error: 'All-correct bonus must be 0 or more' };
  }

  let teams = [];
  if (!combined) {
    teams = (body.teams ?? []).map((t) => String(t).trim()).filter(Boolean);
    if (teams.length < 2) return { error: 'A stage needs at least 2 teams' };
    if (new Set(teams.map((t) => t.toLowerCase())).size !== teams.length) {
      return { error: 'Team names must be unique within a stage' };
    }
    if (pick_count > teams.length) {
      return { error: 'Pick count must be between 1 and the number of teams' };
    }
  }
  return {
    value: { name, description, teams, pick_count, points_per_correct, all_correct_bonus, parent_ids },
  };
};

// Source-stage teams must exist in the reference table (US-114).
const teamError = async (teams) => {
  const missing = await Team.findMissing(teams);
  if (missing.length) {
    return `Unknown team(s): ${missing.join(', ')}. Add them on the Teams page first.`;
  }
  return null;
};

// Validates a combined stage's parent links: each must belong to the game and be
// an earlier stage (which prevents cycles), and the stage's pick_count cannot
// exceed the total it can inherit. selfId is null on create.
const validateParents = async (gameId, parentIds, selfId, pickCount) => {
  const stages = await Stage.findByGame(gameId);
  const byId = new Map(stages.map((s) => [s.id, s]));
  const self = selfId != null ? byId.get(selfId) : null;
  let inheritable = 0;
  for (const pid of parentIds) {
    if (pid === selfId) return 'A stage cannot be its own parent';
    const p = byId.get(pid);
    if (!p) return 'A parent stage does not belong to this game';
    if (self && (p.sort_order > self.sort_order || (p.sort_order === self.sort_order && p.id >= self.id))) {
      return 'Parent stages must come before this stage';
    }
    inheritable += p.pick_count;
  }
  if (pickCount > inheritable) {
    return 'Pick count cannot exceed the total picks inherited from parent stages';
  }
  return null;
};

export const list = async (req, res, next) => {
  try {
    res.json(await Stage.findByGame(req.gameId));
  } catch (err) {
    next(err);
  }
};

// Read-only list of every participant entry with their picks per stage. (US-62)
export const entries = async (req, res, next) => {
  try {
    const [allUsers, stages, sels] = await Promise.all([
      User.findAll(req.gameId),
      Stage.findByGame(req.gameId),
      Selection.findByGame(req.gameId),
    ]);
    // Only approved entries are shown. (US-66)
    const users = allUsers.filter((u) => u.status === 'approved');
    const pickedByUser = new Map();
    for (const s of sels) {
      if (!pickedByUser.has(s.user_id)) pickedByUser.set(s.user_id, new Set());
      pickedByUser.get(s.user_id).add(s.stage_team_id);
    }
    res.json(
      users.map((u) => {
        const picked = pickedByUser.get(u.id) ?? new Set();
        return {
          user_id: u.id,
          display_name: u.display_name,
          stages: stages.map((st) => ({
            id: st.id,
            name: st.name,
            pick_count: st.pick_count,
            teams: st.teams
              .filter((t) => picked.has(t.id))
              .map((t) => ({ id: t.id, name: t.name, is_winner: t.is_winner })),
          })),
        };
      })
    );
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    if (req.game.type !== 'bracket_prediction') {
      return res.status(400).json({ message: 'This game is not a Bracket Prediction game' });
    }
    const { error, value } = parseStage(req.body);
    if (error) return res.status(400).json({ message: error });
    if (value.parent_ids.length) {
      const pErr = await validateParents(req.gameId, value.parent_ids, null, value.pick_count);
      if (pErr) return res.status(400).json({ message: pErr });
    } else {
      const tErr = await teamError(value.teams);
      if (tErr) return res.status(400).json({ message: tErr });
    }
    const id = await Stage.create({ game_id: req.gameId, ...value });
    await Stage.recomputeDerived(req.gameId);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage || stage.game_id !== req.gameId) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const { error, value } = parseStage(req.body);
    if (error) return res.status(400).json({ message: error });
    if (value.parent_ids.length) {
      const pErr = await validateParents(req.gameId, value.parent_ids, stage.id, value.pick_count);
      if (pErr) return res.status(400).json({ message: pErr });
    } else {
      const tErr = await teamError(value.teams);
      if (tErr) return res.status(400).json({ message: tErr });
    }
    await Stage.update(stage.id, value);
    await Stage.recomputeDerived(req.gameId);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage || stage.game_id !== req.gameId) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    await Stage.remove(stage.id);
    await Stage.recomputeDerived(req.gameId);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// Marks the teams that actually qualified/won in a stage. (US-47)
export const setResults = async (req, res, next) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage || stage.game_id !== req.gameId) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const teamIds = Array.isArray(req.body.team_ids)
      ? req.body.team_ids.map(Number).filter(Number.isInteger)
      : [];
    await Stage.setWinners(stage.id, teamIds);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};
