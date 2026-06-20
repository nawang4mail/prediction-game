import * as Team from '../../models/teamModel.js';
import { downloadIcon } from '../../utils/iconDownloader.js';

// Validates and normalises a team payload. `icon_url`, when provided, is downloaded
// locally and stored as a /icons path; an existing icon is kept when none is given.
const parse = async (body, existing = null) => {
  const full_name = (body.full_name ?? '').trim();
  if (!full_name) return { error: 'Full name is required' };
  const short_name = (body.short_name ?? '').trim();
  if (!short_name) return { error: 'Short name is required' };
  const type = body.type === 'club' ? 'club' : 'country';

  let icon = existing?.icon ?? null;
  const iconUrl = (body.icon_url ?? '').trim();
  if (iconUrl) {
    const saved = await downloadIcon(iconUrl, full_name);
    if (!saved) return { error: 'Could not download the icon from that URL' };
    icon = saved;
  }
  return { value: { full_name, short_name, type, icon } };
};

export const list = async (req, res, next) => {
  try {
    res.json(await Team.findAll());
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { error, value } = await parse(req.body);
    if (error) return res.status(400).json({ message: error });
    const id = await Team.create(value);
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A team with that name already exists' });
    }
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const { error, value } = await parse(req.body, team);
    if (error) return res.status(400).json({ message: error });
    await Team.update(team.id, value);
    res.json({ message: 'Updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A team with that name already exists' });
    }
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    await Team.remove(team.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
