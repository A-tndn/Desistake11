import prisma from '../db';
import { BetType, BetStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { config } from '../config';

interface PlaceBetData {
  userId: string;
  matchId: string;
  betType: BetType;
  betOn: string;
  amount: number;
  odds: number;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

class BetService {
  async placeBet(data: PlaceBetData) {
    const { userId, matchId, betType, betOn, amount, odds, description, ipAddress, userAgent } = data;

    // Fetch user with betting settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        creditLimit: true,
        status: true,
        agentId: true,
        bookmakerDelay: true,
        sessionDelay: true,
        matchDelay: true,
        bookmakerMinStack: true,
        bookmakerMaxStack: true,
        betDeleteAllowed: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User not found or inactive', 404);
    }

    // Use player-specific min/max if set, else config defaults
    const minBet = user.bookmakerMinStack ? user.bookmakerMinStack.toNumber() : config.minBetAmount;
    const maxBet = user.bookmakerMaxStack ? user.bookmakerMaxStack.toNumber() : config.maxBetAmount;

    if (amount < minBet) {
      throw new AppError(`Minimum bet amount is ${minBet}`, 400);
    }

    if (amount > maxBet) {
      throw new AppError(`Maximum bet amount is ${maxBet}`, 400);
    }

    if (user.balance.toNumber() < amount) {
      throw new AppError('Insufficient balance', 400);
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { status: true, startTime: true },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    if (match.status === 'COMPLETED' || match.status === 'CANCELLED') {
      throw new AppError('Match has ended', 400);
    }

    // Determine delay based on bet type
    let delay = 0;
    if (betType === 'MATCH_WINNER' || betType === 'TOP_BATSMAN' || betType === 'TOP_BOWLER') {
      delay = user.matchDelay || 4;
    } else if (betType === 'SESSION' || betType === 'FANCY') {
      delay = user.sessionDelay || 3;
    } else {
      delay = user.bookmakerDelay || 3;
    }

    // Record the odds at bet placement time
    const oddsAtPlacement = odds;

    // If delay > 0, wait and verify odds haven't changed
    // The delay is handled server-side: we record bet as PENDING with delay metadata
    // A scheduled check or immediate check after delay verifies odds stability
    // For now, we implement instant placement with delay info returned to frontend

    const potentialWin = amount * odds;

    // Execute in transaction
    const bet = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      if (!freshUser || freshUser.balance.toNumber() < amount) {
        throw new AppError('Insufficient balance', 400);
      }

      const newBalance = freshUser.balance.toNumber() - amount;

      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      const createdBet = await tx.bet.create({
        data: {
          userId,
          matchId,
          betType,
          betOn,
          amount,
          odds,
          potentialWin,
          description,
          ipAddress,
          userAgent,
          status: BetStatus.PENDING,
          metadata: {
            oddsAtPlacement,
            delay,
            placedAt: new Date().toISOString(),
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.BET_PLACED,
          status: TransactionStatus.COMPLETED,
          amount,
          balanceBefore: freshUser.balance,
          balanceAfter: newBalance,
          referenceId: createdBet.id,
          referenceType: 'bet',
          processedBy: 'SYSTEM',
          processedAt: new Date(),
          description: `Bet placed: ${betType} on ${betOn}`,
        },
      });

      await tx.match.update({
        where: { id: matchId },
        data: {
          totalBetsAmount: { increment: amount },
          totalBetsCount: { increment: 1 },
        },
      });

      logger.info(`Bet placed: ${createdBet.id} by user ${userId} for ${amount} with ${delay}s delay`);

      return { bet: createdBet, newBalance };
    });

    return {
      ...bet.bet,
      newBalance: bet.newBalance,
      delay,
      betDeleteAllowed: user.betDeleteAllowed,
    };
  }

  async deleteBet(betId: string, userId: string) {
    // Check if user is allowed to delete bets
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { betDeleteAllowed: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.betDeleteAllowed) {
      throw new AppError('Bet deletion is not allowed for your account', 403);
    }

    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: { user: { select: { balance: true } } },
    });

    if (!bet) {
      throw new AppError('Bet not found', 404);
    }

    if (bet.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    if (bet.status !== BetStatus.PENDING) {
      throw new AppError('Only pending bets can be deleted', 400);
    }

    // Check if bet was placed within the last 30 seconds (grace period)
    const betAge = Date.now() - new Date(bet.createdAt).getTime();
    if (betAge > 30000) {
      throw new AppError('Bet can only be deleted within 30 seconds of placement', 400);
    }

    // Refund the bet amount
    return await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      if (!freshUser) throw new AppError('User not found', 404);

      const newBalance = freshUser.balance.toNumber() + bet.amount.toNumber();

      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      await tx.bet.update({
        where: { id: betId },
        data: {
          status: BetStatus.CANCELLED,
          settledAt: new Date(),
          settledBy: 'USER_DELETE',
          settlementNote: 'Deleted by user within grace period',
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.BET_REFUND,
          status: TransactionStatus.COMPLETED,
          amount: bet.amount,
          balanceBefore: freshUser.balance,
          balanceAfter: newBalance,
          referenceId: betId,
          referenceType: 'bet_delete',
          processedBy: userId,
          processedAt: new Date(),
          description: `Bet deleted by user: ${bet.betType} on ${bet.betOn}`,
        },
      });

      await tx.match.update({
        where: { id: bet.matchId },
        data: {
          totalBetsAmount: { decrement: bet.amount.toNumber() },
          totalBetsCount: { decrement: 1 },
        },
      });

      logger.info(`Bet deleted: ${betId} by user ${userId}, refunded ${bet.amount}`);

      return { betId, refundedAmount: bet.amount.toNumber(), newBalance };
    });
  }

  async settleBet(betId: string, won: boolean) {
    return await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
        include: { user: { select: { balance: true, agentId: true } } },
      });

      if (!bet) {
        throw new AppError('Bet not found', 404);
      }

      if (bet.status !== BetStatus.PENDING) {
        throw new AppError('Bet already settled', 400);
      }

      const status = won ? BetStatus.WON : BetStatus.LOST;
      let actualWin = 0;

      await tx.bet.update({
        where: { id: betId },
        data: {
          status,
          actualWin: won ? bet.potentialWin : 0,
          settledAt: new Date(),
          settledBy: 'AUTO',
        },
      });

      if (won) {
        actualWin = bet.potentialWin.toNumber();
        const newBalance = bet.user.balance.toNumber() + actualWin;

        await tx.user.update({
          where: { id: bet.userId },
          data: { balance: newBalance },
        });

        await tx.transaction.create({
          data: {
            userId: bet.userId,
            type: TransactionType.BET_WON,
            status: TransactionStatus.COMPLETED,
            amount: actualWin,
            balanceBefore: bet.user.balance,
            balanceAfter: newBalance,
            referenceId: betId,
            referenceType: 'bet',
            processedBy: 'SYSTEM',
            processedAt: new Date(),
            description: 'Bet won',
          },
        });

        if (bet.user.agentId) {
          await this.calculateCommissions(tx, bet, actualWin);
        }
      }

      logger.info(`Bet settled: ${betId} - ${won ? 'WON' : 'LOST'}`);

      return { betId, status, actualWin };
    });
  }

  private async calculateCommissions(tx: any, bet: any, winAmount: number) {
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

    const commissions = [];

    const agentComm = winAmount * (agent.commissionRate.toNumber() / 100);
    commissions.push({
      betId: bet.id,
      agentId: agent.id,
      commissionAmount: agentComm,
      commissionRate: agent.commissionRate,
      basedOnAmount: winAmount,
      agentLevel: agent.agentType,
    });

    if (agent.parentAgent) {
      const masterComm = winAmount * (agent.parentAgent.commissionRate.toNumber() / 100);
      commissions.push({
        betId: bet.id,
        agentId: agent.parentAgent.id,
        commissionAmount: masterComm,
        commissionRate: agent.parentAgent.commissionRate,
        basedOnAmount: winAmount,
        agentLevel: agent.parentAgent.agentType,
      });

      if (agent.parentAgent.parentAgent) {
        const superComm = winAmount * (agent.parentAgent.parentAgent.commissionRate.toNumber() / 100);
        commissions.push({
          betId: bet.id,
          agentId: agent.parentAgent.parentAgent.id,
          commissionAmount: superComm,
          commissionRate: agent.parentAgent.parentAgent.commissionRate,
          basedOnAmount: winAmount,
          agentLevel: agent.parentAgent.parentAgent.agentType,
        });
      }
    }

    for (const comm of commissions) {
      await tx.commission.create({ data: comm });
      await tx.agent.update({
        where: { id: comm.agentId },
        data: {
          totalCommission: { increment: comm.commissionAmount },
        },
      });
    }

    logger.info(`Commissions calculated for bet ${bet.id}: ${commissions.length} agents`);
  }

  async getUserBets(userId: string, filters: { status?: BetStatus; limit?: number }) {
    return await prisma.bet.findMany({
      where: {
        userId,
        ...(filters.status && { status: filters.status }),
      },
      include: {
        match: {
          select: {
            name: true,
            team1: true,
            team2: true,
            startTime: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
    });
  }

  async getBetById(betId: string) {
    return await prisma.bet.findUnique({
      where: { id: betId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        match: true,
        commissions: {
          include: {
            agent: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });
  }

  async settleMatchBets(matchId: string, result: { winner: string; [key: string]: any }) {
    const bets = await prisma.bet.findMany({
      where: {
        matchId,
        status: BetStatus.PENDING,
      },
    });

    let settled = 0;

    for (const bet of bets) {
      try {
        const won = this.determineBetOutcome(bet, result);
        await this.settleBet(bet.id, won);
        settled++;
      } catch (error: any) {
        logger.error(`Failed to settle bet ${bet.id}:`, error.message);
      }
    }

    logger.info(`Settled ${settled} bets for match ${matchId}`);
    return { settled };
  }

  private determineBetOutcome(bet: any, result: any): boolean {
    switch (bet.betType) {
      case BetType.MATCH_WINNER:
        return bet.betOn === result.winner;
      default:
        return false;
    }
  }
}

export default new BetService();
