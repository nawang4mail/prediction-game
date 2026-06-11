import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import { getAll, setMany } from '../../models/settingsModel.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await getAll());
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const { prize_text, rules_text } = req.body;
    await setMany({ prize_text: prize_text ?? '', rules_text: rules_text ?? '' });
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
});

export default router;
