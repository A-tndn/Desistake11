import { Router } from 'express';
import * as agentController from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

const createAgentSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  password: Joi.string().min(6).max(100).required(),
  displayName: Joi.string().min(2).max(100).required(),
  agentType: Joi.string().valid('SUPER_MASTER', 'MASTER', 'AGENT').required(),
  parentAgentId: Joi.string().uuid().optional(),
  commissionRate: Joi.number().min(0).max(10).required(),
  creditLimit: Joi.number().min(0).required(),
});

const createPlayerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  password: Joi.string().min(6).max(100).required(),
  displayName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  creditLimit: Joi.number().min(0).default(10000),
});

const transferCreditSchema = Joi.object({
  playerId: Joi.string().uuid().required(),
  amount: Joi.number().min(1).required(),
});

const updateBettingSettingsSchema = Joi.object({
  bookmakerDelay: Joi.number().integer().min(0).max(30).optional(),
  sessionDelay: Joi.number().integer().min(0).max(30).optional(),
  matchDelay: Joi.number().integer().min(0).max(30).optional(),
  bookmakerMinStack: Joi.number().min(0).optional(),
  bookmakerMaxStack: Joi.number().min(0).optional(),
  betDeleteAllowed: Joi.boolean().optional(),
});

router.post('/create-agent', validate(createAgentSchema), agentController.createAgent);
router.post('/create-player', validate(createPlayerSchema), agentController.createPlayer);
router.post('/transfer-credit', validate(transferCreditSchema), agentController.transferCredit);
router.post('/deduct-credit', validate(transferCreditSchema), agentController.deductCredit);
router.get('/players', agentController.getPlayers);
router.get('/stats', agentController.getStats);
router.get('/hierarchy', agentController.getHierarchy);

// Agent Reports
router.get('/reports/account-statement', agentController.getAccountStatement);
router.get('/reports/bet-history', agentController.getBetHistory);
router.get('/reports/client-ledger', agentController.getClientLedger);
router.get('/reports/commissions', agentController.getCommissionReport);

// Master Agent Only - Player Betting Settings
router.get('/master/players', agentController.getMasterAllPlayers);
router.get('/master/players/:playerId/settings', agentController.getPlayerBettingSettings);
router.put('/master/players/:playerId/settings', validate(updateBettingSettingsSchema), agentController.updatePlayerBettingSettings);

export default router;
