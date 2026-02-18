import prisma from '../db';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import betService from '../services/bet.service';

export const placeBet = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { matchId, betType, betOn, amount, odds, isBack, fancyMarketId, description } = req.body;

  const bet = await betService.placeBet({
    userId,
    matchId,
    betType,
    betOn,
    amount: parseFloat(amount),
    odds: parseFloat(odds),
    isBack: isBack !== undefined ? isBack : true,
    fancyMarketId,
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


// ============================================
// PLAYER ACCOUNT STATEMENT
// ============================================

export const getAccountStatement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { from, to, type, page = '1', limit = '50' } = req.query;

  const where: any = { userId };

  // Date filters
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) {
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  // Type filter
  if (type && type !== 'all') {
    where.type = type;
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.transaction.count({ where }),
  ]);

  successResponse(res, 'Account statement retrieved', {
    transactions,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string)),
    },
  });
});
