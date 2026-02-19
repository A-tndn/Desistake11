import { Router } from 'express';
import fancyMarketController from '../controllers/fancyMarket.controller';
import { authenticate, adminAccess, requirePermission, logAdminAction } from '../middleware/auth';

const router = Router();

// ============================================
// PLAYER-FACING ROUTES
// ============================================

// Get active fancy markets for a match
router.get(
  '/matches/:matchId/fancy-markets',
  fancyMarketController.getMarkets
);

// Place a fancy bet (authenticated player)
router.post(
  '/fancy-markets/:id/place-bet',
  authenticate,
  fancyMarketController.placeBet
);

// ============================================
// ADMIN/AGENT ROUTES
// ============================================

// Get ALL fancy markets for a match (including inactive)
router.get(
  '/matches/:matchId/fancy-markets/all',
  authenticate,
  adminAccess,
  fancyMarketController.getAllMarkets
);

// Create a new fancy market
router.post(
  '/matches/:matchId/fancy-markets',
  authenticate,
  adminAccess,
  requirePermission('CAN_MANAGE_ODDS'),
  logAdminAction('create_fancy_market', 'fancy_market'),
  fancyMarketController.createMarket
);

// Suspend/unsuspend all fancy markets
router.put(
  '/matches/:matchId/fancy-markets/suspend-all',
  authenticate,
  adminAccess,
  requirePermission('CAN_MANAGE_ODDS'),
  fancyMarketController.suspendAllMarkets
);

// Toggle bookmaker suspended for match
router.put(
  '/matches/:matchId/bookmaker-suspend',
  authenticate,
  adminAccess,
  requirePermission('CAN_MANAGE_ODDS'),
  fancyMarketController.toggleBookmakerSuspend
);

// Update a fancy market
router.put(
  '/fancy-markets/:id',
  authenticate,
  adminAccess,
  requirePermission('CAN_MANAGE_ODDS'),
  fancyMarketController.updateMarket
);

// Toggle suspend for a single fancy market
router.put(
  '/fancy-markets/:id/toggle-suspend',
  authenticate,
  adminAccess,
  requirePermission('CAN_MANAGE_ODDS'),
  fancyMarketController.toggleSuspend
);

// Settle a fancy market
router.put(
  '/fancy-markets/:id/settle',
  authenticate,
  adminAccess,
  requirePermission('CAN_SETTLE_BETS'),
  logAdminAction('settle_fancy_market', 'fancy_market'),
  fancyMarketController.settleMarket
);

// Delete a fancy market
router.delete(
  '/fancy-markets/:id',
  authenticate,
  adminAccess,
  requirePermission('CAN_MANAGE_ODDS'),
  logAdminAction('delete_fancy_market', 'fancy_market'),
  fancyMarketController.deleteMarket
);

export default router;
