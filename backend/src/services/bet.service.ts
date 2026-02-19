import prisma from '../db';
import { BetType, BetStatus, TransactionType, TransactionStatus, AgentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { config } from '../config';
import * as fin from '../utils/financial';
import { emitBalanceUpdate, emitBetSettled, emitMatchStatusChange } from '../utils/socketEmitter';
import notificationService from './notification.service';

interface PlaceBetData {
  userId: string;
  matchId: string;
  betType: BetType;
  betOn: string;
  amount: number;
  odds: number;
  isBack?: boolean;
  fancyMarketId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

class BetService {
  /**
   * Place a new bet with full validation
   */
  async placeBet(data: PlaceBetData) {
    const {
      userId, matchId, betType, betOn, amount, odds,
      isBack = true, description, ipAddress, userAgent,
    } = data;

    if (amount < config.minBetAmount) {
      throw new AppError(`Minimum bet amount is ${config.minBetAmount}`, 400);
    }

    if (amount > config.maxBetAmount) {
      throw new AppError(`Maximum bet amount is ${config.maxBetAmount}`, 400);
    }

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          balance: true, creditLimit: true, status: true,
          agentId: true, betLocked: true, minBet: true,
          maxBet: true, matchLimit: true,
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new AppError('User not found or inactive', 404);
      }

      if (user.betLocked) {
        throw new AppError('Betting is locked for your account', 403);
      }

      // Check user-specific limits
      if (fin.gt(amount, user.maxBet)) {
        throw new AppError(`Maximum bet for your account is ${user.maxBet}`, 400);
      }
      if (fin.gt(user.minBet, amount)) {
        throw new AppError(`Minimum bet for your account is ${user.minBet}`, 400);
      }

      if (fin.gt(amount, user.balance)) {
        throw new AppError('Insufficient balance', 400);
      }

      const match = await tx.match.findUnique({
        where: { id: matchId },
        select: { status: true, startTime: true, bettingLocked: true, name: true },
      });

      if (!match) {
        throw new AppError('Match not found', 404);
      }

      if (match.bettingLocked) {
        throw new AppError('Betting is locked for this match', 400);
      }

      if (match.status === 'COMPLETED' || match.status === 'CANCELLED') {
        throw new AppError('Match has ended', 400);
      }

      // Check match limit: total bets on this match by this user
      const existingMatchBets = await tx.bet.aggregate({
        where: { userId, matchId, status: 'PENDING' },
        _sum: { amount: true },
      });

      const existingTotal = existingMatchBets._sum.amount || fin.ZERO;
      if (fin.gt(fin.add(existingTotal, amount), user.matchLimit)) {
        throw new AppError(`Match limit exceeded. Your limit: ${user.matchLimit}, already bet: ${existingTotal}`, 400);
      }

      const potentialWin = fin.calculatePayout(amount, odds);
      const balanceBefore = user.balance;
      const balanceAfter = fin.subtract(balanceBefore, amount);

      // Deduct balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: balanceAfter },
      });

      // Create bet
      const bet = await tx.bet.create({
        data: {
          userId,
          matchId,
          betType,
          betOn,
          amount,
          odds,
          potentialWin,
          isBack,
          fancyMarketId: data.fancyMarketId || undefined,
          description,
          ipAddress,
          userAgent,
          status: BetStatus.PENDING,
        },
      });

      // Create transaction
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
          description: `Bet placed: ${betType} on ${betOn}`,
        },
      });

      // Update match totals
      await tx.match.update({
        where: { id: matchId },
        data: {
          totalBetsAmount: { increment: amount },
          totalBetsCount: { increment: 1 },
        },
      });

      logger.info(`Bet placed: ${bet.id} by user ${userId} for ${amount} at odds ${odds}`);

      // Emit balance update
      emitBalanceUpdate(userId, balanceAfter.toString(), 'BET_PLACED');

      return bet;
    });
  }

  /**
   * Settle a single bet — core atomic operation
   */
  async settleBet(betId: string, won: boolean, settledBy: string = 'AUTO') {
    return await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
        include: {
          user: { select: { id: true, balance: true, agentId: true, displayName: true } },
          match: { select: { name: true } },
        },
      });

      if (!bet) {
        throw new AppError('Bet not found', 404);
      }

      if (bet.status !== BetStatus.PENDING) {
        throw new AppError('Bet already settled', 400);
      }

      const status = won ? BetStatus.WON : BetStatus.LOST;
      const actualWin = won ? bet.potentialWin : fin.ZERO;

      // Update bet status
      await tx.bet.update({
        where: { id: betId },
        data: {
          status,
          actualWin,
          settledAt: new Date(),
          settledBy,
        },
      });

      if (won) {
        const balanceBefore = bet.user.balance;
        const balanceAfter = fin.add(balanceBefore, actualWin);

        // Credit winnings to user
        await tx.user.update({
          where: { id: bet.userId },
          data: { balance: balanceAfter },
        });

        // Create win transaction
        await tx.transaction.create({
          data: {
            userId: bet.userId,
            type: TransactionType.BET_WON,
            status: TransactionStatus.COMPLETED,
            amount: actualWin,
            balanceBefore,
            balanceAfter,
            referenceId: betId,
            referenceType: 'bet',
            processedBy: 'SYSTEM',
            processedAt: new Date(),
            description: `Bet won: ${bet.betType} on ${bet.betOn} - ${bet.match.name}`,
          },
        });

        // Calculate commissions up the agent hierarchy
        if (bet.user.agentId) {
          await this.calculateCommissions(tx, bet, actualWin);
        }

        // Emit balance update
        emitBalanceUpdate(bet.userId, balanceAfter.toString(), 'BET_WON');
      }

      // Emit bet settled notification
      emitBetSettled(bet.userId, {
        betId: bet.id,
        status,
        actualWin: actualWin.toString(),
        matchName: bet.match.name,
      });

      // Persist notification
      notificationService.notifyBetSettled(bet.userId, {
        matchName: bet.match.name,
        status,
        amount: bet.amount.toNumber(),
        winAmount: actualWin.toNumber(),
      }).catch(err => logger.error('Failed to persist bet settled notification', err));

      logger.info(`Bet settled: ${betId} - ${status} - Win: ${actualWin}`);

      return { betId, status, actualWin };
    });
  }

  /**
   * Calculate commissions up the agent hierarchy using Decimal math
   * Agent → Master Agent → Super Master Agent
   */
  private async calculateCommissions(tx: any, bet: any, winAmount: Decimal) {
    const agent = await tx.agent.findUnique({
      where: { id: bet.user.agentId },
      include: {
        parentAgent: {
          include: {
            parentAgent: true,
          },
        },
      },
    });

    if (!agent) return;

    // Build commission chain: Agent → Master → Super Master
    const commissionChain: Array<{
      agentId: string;
      commissionRate: Decimal;
      agentLevel: AgentType;
    }> = [];

    commissionChain.push({
      agentId: agent.id,
      commissionRate: agent.commissionRate,
      agentLevel: agent.agentType,
    });

    if (agent.parentAgent) {
      commissionChain.push({
        agentId: agent.parentAgent.id,
        commissionRate: agent.parentAgent.commissionRate,
        agentLevel: agent.parentAgent.agentType,
      });

      if (agent.parentAgent.parentAgent) {
        commissionChain.push({
          agentId: agent.parentAgent.parentAgent.id,
          commissionRate: agent.parentAgent.parentAgent.commissionRate,
          agentLevel: agent.parentAgent.parentAgent.agentType,
        });
      }
    }

    for (const entry of commissionChain) {
      const commissionAmount = fin.calculateCommission(winAmount, entry.commissionRate);

      if (fin.gt(commissionAmount, 0)) {
        await tx.commission.create({
          data: {
            betId: bet.id,
            agentId: entry.agentId,
            commissionAmount,
            commissionRate: entry.commissionRate,
            basedOnAmount: winAmount,
            agentLevel: entry.agentLevel,
          },
        });

        await tx.agent.update({
          where: { id: entry.agentId },
          data: {
            totalCommission: { increment: commissionAmount },
            pendingSettlement: { increment: commissionAmount },
          },
        });

        logger.debug(`Commission: ${commissionAmount} for agent ${entry.agentId} (${entry.agentLevel}) on bet ${bet.id}`);
      }
    }

    logger.info(`Commissions calculated for bet ${bet.id}: ${commissionChain.length} agents`);
  }

  /**
   * Settle ALL pending bets for a match based on result
   */
  async settleMatchBets(
    matchId: string,
    result: { winner: string; [key: string]: any },
    settledBy: string = 'AUTO'
  ) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, name: true, status: true, isSettled: true },
    });

    if (!match) throw new AppError('Match not found', 404);
    if (match.isSettled) throw new AppError('Match already settled', 400);

    const bets = await prisma.bet.findMany({
      where: { matchId, status: BetStatus.PENDING },
    });

    logger.info(`Settling ${bets.length} bets for match ${matchId} (${match.name})`);

    let settledCount = 0;
    let totalPayout = fin.ZERO;
    const errors: string[] = [];

    for (const bet of bets) {
      try {
        const won = this.determineBetOutcome(bet, result);
        const settleResult = await this.settleBet(bet.id, won, settledBy);
        settledCount++;
        if (won) {
          totalPayout = fin.add(totalPayout, settleResult.actualWin);
        }
      } catch (error: any) {
        errors.push(`Bet ${bet.id}: ${error.message}`);
        logger.error(`Failed to settle bet ${bet.id}: ${error.message}`);
      }
    }

    // Mark match as settled
    await prisma.match.update({
      where: { id: matchId },
      data: {
        isSettled: true,
        settledAt: new Date(),
        settledBy,
        matchWinner: result.winner,
        status: 'COMPLETED',
      },
    });

    emitMatchStatusChange(matchId, 'COMPLETED', {
      winner: result.winner,
      totalBetsSettled: settledCount,
    });

    logger.info(`Match ${matchId} settled: ${settledCount}/${bets.length} bets, payout: ${totalPayout}`);

    return {
      matchId,
      matchName: match.name,
      totalBets: bets.length,
      settledCount,
      totalPayout: totalPayout.toString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Determine if a bet won based on match result and bet type
   */
  private determineBetOutcome(bet: any, result: any): boolean {
    switch (bet.betType) {
      case BetType.MATCH_WINNER:
        return bet.betOn === result.winner;

      case BetType.TOP_BATSMAN:
        return bet.betOn === result.topBatsman;

      case BetType.TOP_BOWLER:
        return bet.betOn === result.topBowler;

      case BetType.TOTAL_RUNS:
        if (bet.betOn.startsWith('OVER_')) {
          const target = parseFloat(bet.betOn.split('_')[1]);
          return (result.totalRuns || 0) > target;
        }
        if (bet.betOn.startsWith('UNDER_')) {
          const target = parseFloat(bet.betOn.split('_')[1]);
          return (result.totalRuns || 0) < target;
        }
        return false;

      case BetType.TOTAL_WICKETS:
        if (bet.betOn.startsWith('OVER_')) {
          const target = parseFloat(bet.betOn.split('_')[1]);
          return (result.totalWickets || 0) > target;
        }
        if (bet.betOn.startsWith('UNDER_')) {
          const target = parseFloat(bet.betOn.split('_')[1]);
          return (result.totalWickets || 0) < target;
        }
        return false;

      case BetType.SESSION:
        if (bet.betOn.startsWith('OVER_')) {
          const target = parseFloat(bet.betOn.split('_')[1]);
          return (result.sessionRuns || 0) > target;
        }
        if (bet.betOn.startsWith('UNDER_')) {
          const target = parseFloat(bet.betOn.split('_')[1]);
          return (result.sessionRuns || 0) < target;
        }
        return false;

      case BetType.FANCY:
        if (result.fancyResults && result.fancyResults[bet.betOn] !== undefined) {
          return result.fancyResults[bet.betOn] === true;
        }
        return false;

      case BetType.OVER_UNDER:
        if (bet.betOn.startsWith('OVER_')) {
          const target = parseFloat(bet.betOn.split('_')[1]);
          return (result.value || 0) > target;
        }
        if (bet.betOn.startsWith('UNDER_')) {
          const target = parseFloat(bet.betOn.split('_')[1]);
          return (result.value || 0) < target;
        }
        return false;

      case BetType.PLAYER_PERFORMANCE:
        if (result.playerPerformance && result.playerPerformance[bet.betOn] !== undefined) {
          return result.playerPerformance[bet.betOn] === true;
        }
        return false;

      default:
        logger.warn(`Unknown bet type: ${bet.betType} for bet ${bet.id}`);
        return false;
    }
  }

  /**
   * Cancel/void all pending bets for a match (e.g., match cancelled)
   */
  async voidMatchBets(matchId: string, reason: string = 'Match cancelled') {
    const bets = await prisma.bet.findMany({
      where: { matchId, status: BetStatus.PENDING },
      include: { user: { select: { id: true, balance: true } } },
    });

    let refundedCount = 0;

    for (const bet of bets) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: BetStatus.VOID,
              settledAt: new Date(),
              settledBy: 'SYSTEM',
              settlementNote: reason,
            },
          });

          const balanceBefore = bet.user.balance;
          const balanceAfter = fin.add(balanceBefore, bet.amount);

          await tx.user.update({
            where: { id: bet.userId },
            data: { balance: balanceAfter },
          });

          await tx.transaction.create({
            data: {
              userId: bet.userId,
              type: TransactionType.BET_REFUND,
              status: TransactionStatus.COMPLETED,
              amount: bet.amount,
              balanceBefore,
              balanceAfter,
              referenceId: bet.id,
              referenceType: 'bet',
              processedBy: 'SYSTEM',
              processedAt: new Date(),
              description: `Bet voided: ${reason}`,
            },
          });

          emitBalanceUpdate(bet.userId, balanceAfter.toString(), 'BET_REFUND');
        });

        refundedCount++;
      } catch (error: any) {
        logger.error(`Failed to void bet ${bet.id}: ${error.message}`);
      }
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'CANCELLED',
        isSettled: true,
        settledAt: new Date(),
        settledBy: 'SYSTEM',
      },
    });

    emitMatchStatusChange(matchId, 'CANCELLED', { reason });

    logger.info(`Voided ${refundedCount}/${bets.length} bets for match ${matchId}: ${reason}`);
    return { matchId, totalBets: bets.length, refundedCount, reason };
  }

  /**
   * Get user's bet history with filters and pagination
   */
  async getUserBets(userId: string, filters: {
    status?: BetStatus;
    matchId?: string;
    betType?: BetType;
    limit?: number;
    page?: number;
  }) {
    const { status, matchId, betType, limit = 50, page = 1 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;
    if (matchId) where.matchId = matchId;
    if (betType) where.betType = betType;

    const [bets, total] = await Promise.all([
      prisma.bet.findMany({
        where,
        include: {
          match: {
            select: {
              name: true, shortName: true, team1: true, team2: true,
              startTime: true, status: true, matchWinner: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bet.count({ where }),
    ]);

    return {
      bets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get bet by ID with full details
   */
  async getBetById(betId: string) {
    return await prisma.bet.findUnique({
      where: { id: betId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
        match: true,
        commissions: {
          include: {
            agent: {
              select: { id: true, username: true, displayName: true, agentType: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get user's P&L summary
   */
  async getUserPnL(userId: string, startDate?: Date, endDate?: Date) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const bets = await prisma.bet.findMany({
      where: {
        userId,
        status: { in: ['WON', 'LOST'] },
        ...(Object.keys(dateFilter).length ? { settledAt: dateFilter } : {}),
      },
      select: { amount: true, actualWin: true, status: true },
    });

    let totalStaked = fin.ZERO;
    let totalWon = fin.ZERO;
    let wonCount = 0;
    let lostCount = 0;

    for (const bet of bets) {
      totalStaked = fin.add(totalStaked, bet.amount);
      if (bet.status === 'WON' && bet.actualWin) {
        totalWon = fin.add(totalWon, bet.actualWin);
        wonCount++;
      } else {
        lostCount++;
      }
    }

    const profitLoss = fin.subtract(totalWon, totalStaked);
    const totalBets = wonCount + lostCount;
    const winRate = totalBets > 0 ? ((wonCount / totalBets) * 100).toFixed(1) : '0.0';

    return {
      totalBets,
      wonCount,
      lostCount,
      totalStaked: totalStaked.toString(),
      totalWon: totalWon.toString(),
      profitLoss: profitLoss.toString(),
      winRate,
    };
  }
}

export default new BetService();
