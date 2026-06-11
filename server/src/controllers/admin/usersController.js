import * as User from '../../models/userModel.js';

export const list = async (req, res, next) => {
  try {
    res.json(await User.findAll());
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const id = await User.create(req.body);
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Display name already taken' });
    }
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
    const skipped = [];
    for (const name of names) {
      try {
        const id = await User.create({ display_name: name });
        added.push({ id, display_name: name });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          skipped.push({ display_name: name, reason: 'duplicate' });
        } else {
          throw err;
        }
      }
    }
    res.status(201).json({ added, skipped });
  } catch (err) {
    next(err);
  }
};
