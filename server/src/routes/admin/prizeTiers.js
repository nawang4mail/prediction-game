import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import requireGameStatus from '../../middleware/requireGameStatus.js';
import { findByGame, replaceAll } from '../../models/prizeTierModel.js';

const router = Router();

router.use(requireAuth, gameScope);

router.get('/', async (req, res, next) => {
  try {
    res.json(await findByGame(req.gameId));
  } catch (err) {
    next(err);
  }
});

// Prize tiers can be edited any time the game is not finished. (US-36)
router.put('/', requireGameStatus('draft', 'open', 'locked'), async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body.tiers) ? req.body.tiers : [];
    const tiers = incoming.map((t) => ({
      label: String(t.label ?? '').trim() || 'Prize',
      percentage: Math.max(0, Number(t.percentage) || 0),
    }));
    await replaceAll(req.gameId, tiers);
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
});

export default router;
