import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import requireGameStatus from '../../middleware/requireGameStatus.js';
import { list, create, update, remove, setResult } from '../../controllers/admin/matchesController.js';

const router = Router();

router.use(requireAuth, gameScope);

// Fixtures can only be changed before the game starts (draft/open). Results can
// still be recorded once it is open or locked, but not after it is finished. (US-39)
const fixturesEditable = requireGameStatus('draft', 'open');
const resultsEditable = requireGameStatus('open', 'locked');

router.get('/', list);
router.post('/', fixturesEditable, create);
router.put('/:id', fixturesEditable, update);
router.delete('/:id', fixturesEditable, remove);
router.put('/:id/result', resultsEditable, setResult);

export default router;
