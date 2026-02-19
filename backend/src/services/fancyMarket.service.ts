import prisma from '../db';
import { FancyMarketCategory, BetType, BetStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import * as fin from '../utils/financial';
import { emitToMatch, broadcastAll, emitBalanceUpdate, emitBetSettled } from '../utils/socketEmitter';
import notificationService from './notification.service';

interface CreateFancyMarketData {
  matchId: string;
  marketName: string;
  category?: FancyMarketCategory;
  noValue?: number;
  yesValue?: number;
  noRate?: number;
  yesRate?: number;
  minBet?: number;
  maxBet?: number;
  sortOrder?: number;
  createdBy?: string;
}

interface UpdateFancyMarketData {
  noValue?: number;
  yesValue?: number;
  noRate?: number;
  yesRate?: number;
  isSuspended?: boolean;
  isActive?: boolean;
  minBet?: number;
  maxBet?: number;
  sortOrder?: number;
  marketName?: string;
}

class FancyMarketService {
  /**
   * Get all active fancy markets for a match
   */
  async getMarketsByMatch(matchId: string) {
    return await prisma.fancyMarket.findMany({
      where: {
        matchId,
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Get all fancy markets for a match (including inactive - for admin)
   */
  async getAllMarketsByMatch(matchId: string) {
    return await prisma.fancyMarket.findMany({
      where: { matchId },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Create a new fancy market
   */
  async createMarket(data: CreateFancyMarketData) {
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
      select: { id: true, name: true, status: true },
    });

    if (!match) throw new AppError('Match not found', 404);

    const market = await prisma.fancyMarket.create({
      data: {
        matchId: data.matchId,
        marketName: data.marketName,
        category: data.category || FancyMarketCategory.SESSION,
        noValue: data.noValue ?? null,
        yesValue: data.yesValue ?? null,
        noRate: data.noRate ?? 100,
        yesRate: data.yesRate ?? 100,
        minBet: data.minBet ?? 100,
        maxBet: data.maxBet ?? 25000,
        sortOrder: data.sortOrder ?? 0,
        metadata: data.createdBy ? { createdBy: data.createdBy } : undefined,
      },
    });

    // Emit to match room
    emitToMatch(data.matchId, 'fancy:new', {
      matchId: data.matchId,
      market,
    });

    logger.info(`Fancy market created: ${market.id} - ${data.marketName} for match ${data.matchId}`);
    return market;
  }

  /**
   * Update a fancy market (odds, suspend, etc.)
   */
  async updateMarket(marketId: string, data: UpdateFancyMarketData) {
    const market = await prisma.fancyMarket.findUnique({
      where: { id: marketId },
      select: { id: true, matchId: true, isSettled: true },
    });

    if (!market) throw new AppError('Fancy market not found', 404);
    if (market.isSettled) throw new AppError('Market already settled', 400);

    const updated = await prisma.fancyMarket.update({
      where: { id: marketId },
      data,
    });

    // Emit update to match room
    emitToMatch(market.matchId, 'fancy:updated', {
      matchId: market.matchId,
      market: updated,
    });

    return updated;
  }

  /**
   * Toggle suspended state
   */
  async toggleSuspended(marketId: string) {
    const market = await prisma.fancyMarket.findUnique({
      where: { id: marketId },
      select: { id: true, matchId: true, isSuspended: true, isSettled: true },
    });

    if (!market) throw new AppError('Fancy market not found', 404);
    if (market.isSettled) throw new AppError('Market already settled', 400);

    const updated = await prisma.fancyMarket.update({
      where: { id: marketId },
      data: { isSuspended: !market.isSuspended },
    });

    emitToMatch(market.matchId, 'fancy:suspended', {
      matchId: market.matchId,
      marketId,
      isSuspended: updated.isSuspended,
    });

    return updated;
  }

  /**
   * Toggle bookmaker suspended for entire match
   */
  async toggleBookmakerSuspended(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, bookmakerSuspended: true },
    });

    if (!match) throw new AppError('Match not found', 404);

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { bookmakerSuspended: !match.bookmakerSuspended },
    });

    emitToMatch(matchId, 'bookmaker:suspended', {
      matchId,
      isSuspended: updated.bookmakerSuspended,
    });

    return updated;
  }

  /**
   * Suspend all fancy markets for a match
   */
  async suspendAllMarkets(matchId: string, suspended: boolean) {
    await prisma.fancyMarket.updateMany({
      where: { matchId, isActive: true, isSettled: false },
      data: { isSuspended: suspended },
    });

    emitToMatch(matchId, 'fancy:all-suspended', {
      matchId,
      isSuspended: suspended,
    });

    return { matchId, suspended };
  }

  /**
   * Settle a fancy market with result
   */
  async settleMarket(marketId: string, resultValue: number, settledBy: string) {
    const market = await prisma.fancyMarket.findUnique({
      where: { id: marketId },
      select: { id: true, matchId: true, isSettled: true, marketName: true, noValue: true, yesValue: true },
    });

    if (!market) throw new AppError('Fancy market not found', 404);
    if (market.isSettled) throw new AppError('Market already settled', 400);

    // Update market with result
    const updated = await prisma.fancyMarket.update({
      where: { id: marketId },
      data: {
        result: String(resultValue),
        isSettled: true,
        settledAt: new Date(),
        settledBy,
        isSuspended: true,
      },
    });

    // Settle all pending bets for this market
    const bets = await prisma.bet.findMany({
      where: {
        fancyMarketId: marketId,
        status: BetStatus.PENDING,
      },
      include: {
        user: { select: { id: true, balance: true, agentId: true } },
      },
    });

    let settledCount = 0;
    for (const bet of bets) {
      try {
        // Determine outcome: if betOn starts with YES_, result >= yesValue means YES wins
        // if betOn starts with NO_, result < noValue means NO wins
        let won = false;
        if (bet.betOn.startsWith('YES_')) {
          const target = parseFloat(bet.betOn.split('YES_')[1]);
          won = resultValue >= target;
        } else if (bet.betOn.startsWith('NO_')) {
          const target = parseFloat(bet.betOn.split('NO_')[1]);
          won = resultValue < target;
        }

        const status = won ? BetStatus.WON : BetStatus.LOST;
        const actualWin = won ? bet.potentialWin : fin.ZERO;

        await prisma.$transaction(async (tx) => {
          await tx.bet.update({
            where: { id: bet.id },
            data: { status, actualWin, settledAt: new Date(), settledBy },
          });

          if (won) {
            const balanceBefore = bet.user.balance;
            const balanceAfter = fin.add(balanceBefore, actualWin);

            await tx.user.update({
              where: { id: bet.userId },
              data: { balance: balanceAfter },
            });

            await tx.transaction.create({
              data: {
                userId: bet.userId,
                type: TransactionType.BET_WON,
                status: TransactionStatus.COMPLETED,
                amount: actualWin,
                balanceBefore,
                balanceAfter,
                referenceId: bet.id,
                referenceType: 'bet',
                processedBy: 'SYSTEM',
                processedAt: new Date(),
                description: `Fancy bet won: ${market.marketName} - Result: ${resultValue}`,
              },
            });

            emitBalanceUpdate(bet.userId, balanceAfter.toString(), 'BET_WON');
          }

          emitBetSettled(bet.userId, {
            betId: bet.id,
            status,
            actualWin: actualWin.toString(),
            matchName: market.marketName,
          });
        });

        settledCount++;
      } catch (error: any) {
        logger.error(`Failed to settle fancy bet ${bet.id}: ${error.message}`);
      }
    }

    // Emit settlement event
    emitToMatch(market.matchId, 'fancy:settled', {
      matchId: market.matchId,
      marketId,
      result: resultValue,
      settledCount,
    });

    logger.info(`Fancy market ${marketId} settled: result=${resultValue}, bets=${settledCount}/${bets.length}`);
    return { marketId, result: resultValue, totalBets: bets.length, settledCount };
  }

  /**
   * Place a fancy bet
   */
  async placeFancyBet(data: {
    userId: string;
    matchId: string;
    fancyMarketId: string;
    betOn: string;  // "YES_35" or "NO_32"
    amount: number;
    odds: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { userId, matchId, fancyMarketId, betOn, amount, odds, ipAddress, userAgent } = data;

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          balance: true, status: true, betLocked: true,
          minBet: true, maxBet: true, sessionLimit: true,
        },
      });

      if (!user || user.status !== 'ACTIVE') throw new AppError('User not found or inactive', 404);
      if (user.betLocked) throw new AppError('Betting is locked for your account', 403);

      const market = await tx.fancyMarket.findUnique({
        where: { id: fancyMarketId },
        select: { id: true, matchId: true, isSuspended: true, isActive: true, isSettled: true, minBet: true, maxBet: true, marketName: true },
      });

      if (!market) throw new AppError('Fancy market not found', 404);
      // Allow betting on UPCOMING match markets even if external feed reports suspended
      const matchForSuspendCheck = await tx.match.findUnique({ where: { id: matchId }, select: { status: true } });
      if (market.isSuspended && matchForSuspendCheck?.status !== 'UPCOMING') {
        throw new AppError('Market is suspended', 400);
      }
      if (!market.isActive) throw new AppError('Market is not active', 400);
      if (market.isSettled) throw new AppError('Market already settled', 400);

      if (fin.gt(amount, user.balance)) throw new AppError('Insufficient balance', 400);
      if (fin.gt(market.minBet, amount)) throw new AppError(`Minimum bet is ${market.minBet}`, 400);
      if (fin.gt(amount, market.maxBet)) throw new AppError(`Maximum bet is ${market.maxBet}`, 400);

      // Check session limit
      const existingSessionBets = await tx.bet.aggregate({
        where: { userId, matchId, betType: { in: ['SESSION', 'FANCY'] }, status: 'PENDING' },
        _sum: { amount: true },
      });
      const existingTotal = existingSessionBets._sum.amount || fin.ZERO;
      if (fin.gt(fin.add(existingTotal, amount), user.sessionLimit)) {
        throw new AppError(`Session limit exceeded. Your limit: ${user.sessionLimit}`, 400);
      }

      const potentialWin = fin.calculatePayout(amount, odds);
      const balanceBefore = user.balance;
      const balanceAfter = fin.subtract(balanceBefore, amount);

      await tx.user.update({
        where: { id: userId },
        data: { balance: balanceAfter },
      });

      const isYes = betOn.startsWith('YES_');
      const bet = await tx.bet.create({
        data: {
          userId,
          matchId,
          fancyMarketId,
          betType: BetType.FANCY,
          betOn,
          amount,
          odds,
          potentialWin,
          isBack: isYes,
          description: `${market.marketName} - ${isYes ? 'Yes' : 'No'}`,
          ipAddress,
          userAgent,
          status: BetStatus.PENDING,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.BET_PLACED,
          status: TransactionStatus.COMPLETED,
          amount,
          balanceBefore,
          balanceAfter,
          referenceId: bet.id,
          referenceType: 'bet',
          processedBy: 'SYSTEM',
          processedAt: new Date(),
          description: `Fancy bet: ${market.marketName} - ${betOn}`,
        },
      });

      await tx.match.update({
        where: { id: matchId },
        data: {
          totalBetsAmount: { increment: amount },
          totalBetsCount: { increment: 1 },
        },
      });

      emitBalanceUpdate(userId, balanceAfter.toString(), 'BET_PLACED');

      logger.info(`Fancy bet placed: ${bet.id} on ${market.marketName} by user ${userId}`);
      return bet;
    });
  }

  /**
   * Delete a fancy market (admin only, only if no bets)
   */
  async deleteMarket(marketId: string) {
    const market = await prisma.fancyMarket.findUnique({
      where: { id: marketId },
      include: { _count: { select: { bets: true } } },
    });

    if (!market) throw new AppError('Fancy market not found', 404);
    if (market._count.bets > 0) throw new AppError('Cannot delete market with existing bets', 400);

    await prisma.fancyMarket.delete({ where: { id: marketId } });

    emitToMatch(market.matchId, 'fancy:deleted', {
      matchId: market.matchId,
      marketId,
    });

    return { deleted: true };
  }
}

export default new FancyMarketService();
