import { Router } from 'express';
import * as agentController from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

const createAgentSchema = Joi.object({
  username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(50).required(),
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
  username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(50).required(),
  password: Joi.string().min(6).max(100).required(),
  displayName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  creditLimit: Joi.number().min(0).default(10000),
  sportShare: Joi.number().min(0).max(100).optional(),
  matchCommission: Joi.number().min(0).max(100).optional(),
  sessionCommission: Joi.number().min(0).max(100).optional(),
});

const transferCreditSchema = Joi.object({
  playerId: Joi.string().uuid().required(),
  amount: Joi.number().min(1).required(),
});

// Agent profile & auth
router.get('/profile', agentController.getProfile);
router.put('/change-password', agentController.changePassword);

// Player management
router.post('/create-agent', validate(createAgentSchema), agentController.createAgent);
router.post('/create-player', validate(createPlayerSchema), agentController.createPlayer);
router.get('/players', agentController.getPlayers);
router.put('/players/:playerId/change-password', agentController.changePlayerPassword);

// Credits
router.post('/transfer-credit', validate(transferCreditSchema), agentController.transferCredit);
router.post('/deduct-credit', validate(transferCreditSchema), agentController.deductCredit);

// Reports & data
router.get('/stats', agentController.getStats);
router.get('/hierarchy', agentController.getHierarchy);
router.get('/account-statement', agentController.getAccountStatement);
router.get('/reports/current-bets', agentController.getCurrentBets);
router.get('/reports/match-bets/:matchId', agentController.getMatchBetsForAgent);
router.get('/reports/bet-history', agentController.getBetHistory);
router.get('/reports/my-ledger', agentController.getMyLedger);
router.get('/reports/details', agentController.getReportDetails);

// Commission & ledger
router.get('/commission-report', agentController.getCommissionReport);
router.get('/client-ledger', agentController.getClientLedger);
router.get('/reports/commission-lena-dena', agentController.getCommissionLenaDena);

// Casino
router.get('/casino/details', agentController.getCasinoDetails);

// Banners
router.get('/banners', agentController.getBanners);

// Cash transactions
router.post('/cash-transaction', agentController.createCashTransaction);
router.get('/cash-transactions', agentController.getCashTransactions);

export default router;
