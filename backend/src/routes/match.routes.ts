import { Router } from 'express';
import * as matchController from '../controllers/match.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', matchController.getMatches);
router.get('/:id', matchController.getMatchById);

router.post('/sync', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), matchController.syncMatches);
router.post('/update-scores', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), matchController.updateScores);

export default router;
