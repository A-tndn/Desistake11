import { Router } from 'express';
import * as betController from '../controllers/bet.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { bettingLimiter } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

const placeBetSchema = Joi.object({
  matchId: Joi.string().uuid().required(),
  betType: Joi.string()
    .valid(
      'MATCH_WINNER',
      'TOP_BATSMAN',
      'TOP_BOWLER',
      'TOTAL_RUNS',
      'TOTAL_WICKETS',
      'PLAYER_PERFORMANCE',
      'SESSION',
      'FANCY',
      'OVER_UNDER',
      'PARLAY'
    )
    .required(),
  betOn: Joi.string().required(),
  amount: Joi.number().min(10).max(100000).required(),
  odds: Joi.number().min(1).required(),
  description: Joi.string().optional(),
  isBack: Joi.boolean().optional().default(true),
  fancyMarketId: Joi.string().uuid().optional().allow(null),
});

router.post('/', bettingLimiter, validate(placeBetSchema), betController.placeBet);
router.get('/', betController.getUserBets);
router.get('/account-statement', betController.getAccountStatement);
router.get('/:id', betController.getBetById);

export default router;
