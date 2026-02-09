import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import betService from '../services/bet.service';

export const placeBet = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { matchId, betType, betOn, amount, odds, description } = req.body;

  const bet = await betService.placeBet({
    userId,
    matchId,
    betType,
    betOn,
    amount: parseFloat(amount),
    odds: parseFloat(odds),
    description,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  successResponse(res, 'Bet placed successfully', bet, 201);
});

export const getUserBets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { status, limit } = req.query;

  const bets = await betService.getUserBets(userId, {
    status: status as any,
    limit: limit ? parseInt(limit as string) : undefined,
  });

  successResponse(res, 'Bets retrieved successfully', bets);
});

export const getBetById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const bet = await betService.getBetById(id);

  if (!bet) {
    return errorResponse(res, 'Bet not found', 404);
  }

  successResponse(res, 'Bet retrieved successfully', bet);
});
