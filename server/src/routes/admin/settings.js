import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import { getAll, setMany } from '../../models/settingsModel.js';

const router = Router();

router.use(requireAuth, gameScope);

router.get('/', async (req, res, next) => {
  try {
    res.json(await getAll(req.gameId));
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const { prize_text, rules_text, finish_message, entry_cost, commission_pct } = req.body;
    await setMany(req.gameId, {
      prize_text: prize_text ?? '',
      rules_text: rules_text ?? '',
      finish_message: finish_message ?? '',
      entry_cost: String(entry_cost ?? '0'),
      commission_pct: String(commission_pct ?? '0'),
    });
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
});

export default router;
