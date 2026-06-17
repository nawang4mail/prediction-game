import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import requireGameStatus from '../../middleware/requireGameStatus.js';
import {
  list,
  entries,
  create,
  update,
  remove,
  setResults,
} from '../../controllers/admin/bracketController.js';

const router = Router();

router.use(requireAuth, gameScope);

// Stages, like fixtures (US-39), can only be edited before the game starts.
// Results can be recorded once the game is open or locked, but not when finished.
const editable = requireGameStatus('draft', 'open');
const resultsEditable = requireGameStatus('open', 'locked');

router.get('/', list);
router.get('/entries', entries); // read-only participant entries (US-62)
router.post('/', editable, create);
router.put('/:id/results', resultsEditable, setResults);
router.put('/:id', editable, update);
router.delete('/:id', editable, remove);

export default router;
