import { Router } from 'express';
import * as betController from '../controllers/bet.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
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
});

router.post('/', validate(placeBetSchema), betController.placeBet);
router.get('/', betController.getUserBets);
router.get('/:id', betController.getBetById);

export default router;
