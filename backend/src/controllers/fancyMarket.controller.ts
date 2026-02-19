import { Request, Response, NextFunction } from 'express';
import fancyMarketService from '../services/fancyMarket.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

class FancyMarketController {
  /**
   * GET /api/v1/matches/:matchId/fancy-markets
   * Get all active fancy markets for a match (player-facing)
   */
  async getMarkets(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const markets = await fancyMarketService.getMarketsByMatch(matchId);
      res.json({ status: 'success', data: markets });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/matches/:matchId/fancy-markets/all
   * Get all fancy markets including inactive (admin/agent)
   */
  async getAllMarkets(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const markets = await fancyMarketService.getAllMarketsByMatch(matchId);
      res.json({ status: 'success', data: markets });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/matches/:matchId/fancy-markets
   * Create a new fancy market (admin/agent)
   */
  async createMarket(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const { marketName, category, noValue, yesValue, noRate, yesRate, minBet, maxBet, sortOrder } = req.body;

      if (!marketName) throw new AppError('Market name is required', 400);

      const market = await fancyMarketService.createMarket({
        matchId,
        marketName,
        category,
        noValue,
        yesValue,
        noRate,
        yesRate,
        minBet,
        maxBet,
        sortOrder,
        createdBy: (req as any).user?.id || (req as any).agent?.id,
      });

      res.status(201).json({ status: 'success', data: market });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/fancy-markets/:id
   * Update a fancy market (admin/agent)
   */
  async updateMarket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { noValue, yesValue, noRate, yesRate, isSuspended, isActive, minBet, maxBet, sortOrder, marketName } = req.body;

      const market = await fancyMarketService.updateMarket(id, {
        noValue, yesValue, noRate, yesRate, isSuspended, isActive, minBet, maxBet, sortOrder, marketName,
      });

      res.json({ status: 'success', data: market });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/fancy-markets/:id/toggle-suspend
   * Toggle suspended state (admin/agent)
   */
  async toggleSuspend(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const market = await fancyMarketService.toggleSuspended(id);
      res.json({ status: 'success', data: market });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/matches/:matchId/bookmaker-suspend
   * Toggle bookmaker suspended for match (admin/agent)
   */
  async toggleBookmakerSuspend(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const match = await fancyMarketService.toggleBookmakerSuspended(matchId);
      res.json({ status: 'success', data: { bookmakerSuspended: match.bookmakerSuspended } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/matches/:matchId/fancy-markets/suspend-all
   * Suspend/unsuspend all fancy markets (admin/agent)
   */
  async suspendAllMarkets(req: Request, res: Response, next: NextFunction) {
    try {
      const { matchId } = req.params;
      const { suspended } = req.body;
      const result = await fancyMarketService.suspendAllMarkets(matchId, suspended !== false);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/fancy-markets/:id/settle
   * Settle a fancy market with result (admin/agent)
   */
  async settleMarket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { result } = req.body;

      if (result === undefined || result === null) {
        throw new AppError('Result value is required', 400);
      }

      const settledBy = (req as any).user?.id || (req as any).agent?.id || 'SYSTEM';
      const settlement = await fancyMarketService.settleMarket(id, parseFloat(result), settledBy);
      res.json({ status: 'success', data: settlement });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/fancy-markets/:id
   * Delete a fancy market (admin only)
   */
  async deleteMarket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await fancyMarketService.deleteMarket(id);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/fancy-markets/:id/place-bet
   * Place a bet on a fancy market (player)
   */
  async placeBet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { betOn, amount, odds } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) throw new AppError('Authentication required', 401);
      if (!betOn) throw new AppError('betOn is required (YES_value or NO_value)', 400);
      if (!amount || amount <= 0) throw new AppError('Valid amount is required', 400);
      if (!odds || odds <= 0) throw new AppError('Valid odds are required', 400);

      const market = await fancyMarketService.placeFancyBet({
        userId,
        matchId: req.body.matchId,
        fancyMarketId: id,
        betOn,
        amount: parseFloat(amount),
        odds: parseFloat(odds),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({ status: 'success', data: market });
    } catch (error) {
      next(error);
    }
  }
}

export default new FancyMarketController();
