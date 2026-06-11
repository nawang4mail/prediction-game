import * as Match from '../../models/matchModel.js';

const MAX_MATCHES = 10;

export const list = async (req, res, next) => {
  try {
    res.json(await Match.findAll());
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    if ((await Match.count()) >= MAX_MATCHES) {
      return res.status(400).json({ message: 'Maximum of 10 matches reached' });
    }
    const id = await Match.create(req.body);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const affected = await Match.update(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: 'Match not found' });
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const affected = await Match.remove(req.params.id);
    if (!affected) return res.status(404).json({ message: 'Match not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
