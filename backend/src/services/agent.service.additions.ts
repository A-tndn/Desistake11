import prisma from '../db';
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/password';
import logger from '../config/logger';
import { UserStatus } from '@prisma/client';

// ============================================
// Username Generation
// ============================================

const ADJECTIVES = [
  'lucky', 'swift', 'cool', 'bold', 'keen', 'wild', 'fast', 'calm',
  'brave', 'sharp', 'prime', 'epic', 'mega', 'super', 'royal', 'golden',
  'iron', 'dark', 'red', 'blue', 'slick', 'pro', 'ace', 'top',
  'fire', 'ice', 'star', 'ninja', 'turbo', 'ultra', 'power', 'alpha',
  'rapid', 'silent', 'storm', 'flash', 'blaze', 'frost', 'steel', 'titan',
  'noble', 'grand', 'pure', 'vivid', 'free', 'high', 'peak', 'max',
];

const NOUNS = [
  'tiger', 'hawk', 'bat', 'lion', 'wolf', 'eagle', 'fox', 'bear',
  'shark', 'panther', 'cobra', 'falcon', 'viper', 'dragon', 'phoenix', 'ace',
  'king', 'knight', 'rider', 'chief', 'boss', 'champ', 'guru', 'sage',
  'blitz', 'bolt', 'dart', 'jet', 'rock', 'blade', 'spark', 'pulse',
  'racer', 'hunter', 'scout', 'ranger', 'striker', 'maverick', 'rebel', 'legend',
  'storm', 'flame', 'shadow', 'ghost', 'orbit', 'comet', 'drift', 'surge',
];

class AgentServiceAdditions {

  // ============================================
  // 1. Auto-generate Username
  // ============================================

  async generateUsername(): Promise<string> {
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
      const digits = String(Math.floor(Math.random() * 90) + 10); // 10-99
      const candidate = `${adj}_${noun}${digits}`;

      const existing = await prisma.user.findUnique({
        where: { username: candidate },
      });

      if (!existing) {
        return candidate;
      }
    }

    // Fallback: timestamp-based to guarantee uniqueness
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const ts = Date.now().toString(36).slice(-4);
    return `${adj}_${noun}_${ts}`;
  }

  // ============================================
  // 2. Toggle Player Login Lock (userLocked)
  // ============================================

  async togglePlayerLock(agentId: string, playerId: string) {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentId: true, username: true, metadata: true },
    });

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    if (player.agentId !== agentId) {
      throw new AppError('Player does not belong to this agent', 403);
    }

    const currentMeta = (player.metadata as Record<string, any>) || {};
    const currentLocked = currentMeta.userLocked === true;
    const newLocked = !currentLocked;

    const updated = await prisma.user.update({
      where: { id: playerId },
      data: {
        metadata: {
          ...currentMeta,
          userLocked: newLocked,
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        metadata: true,
      },
    });

    logger.info(
      `Player ${playerId} login ${newLocked ? 'locked' : 'unlocked'} by agent ${agentId}`
    );

    return {
      playerId: updated.id,
      username: updated.username,
      userLocked: newLocked,
    };
  }

  // ============================================
  // 3. Toggle Player Bet Lock (betLocked)
  // ============================================

  async togglePlayerBetLock(agentId: string, playerId: string) {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentId: true, username: true, metadata: true },
    });

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    if (player.agentId !== agentId) {
      throw new AppError('Player does not belong to this agent', 403);
    }

    const currentMeta = (player.metadata as Record<string, any>) || {};
    const currentBetLocked = currentMeta.betLocked === true;
    const newBetLocked = !currentBetLocked;

    const updated = await prisma.user.update({
      where: { id: playerId },
      data: {
        metadata: {
          ...currentMeta,
          betLocked: newBetLocked,
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        metadata: true,
      },
    });

    logger.info(
      `Player ${playerId} betting ${newBetLocked ? 'locked' : 'unlocked'} by agent ${agentId}`
    );

    return {
      playerId: updated.id,
      username: updated.username,
      betLocked: newBetLocked,
    };
  }

  // ============================================
  // 4. Update Player Info
  // ============================================

  async updatePlayerInfo(
    agentId: string,
    playerId: string,
    data: {
      displayName?: string;
      email?: string;
      phone?: string;
      creditLimit?: number;
      remark?: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      const player = await tx.user.findUnique({
        where: { id: playerId },
        select: {
          id: true,
          agentId: true,
          username: true,
          displayName: true,
          email: true,
          phone: true,
          creditLimit: true,
          metadata: true,
        },
      });

      if (!player) {
        throw new AppError('Player not found', 404);
      }

      if (player.agentId !== agentId) {
        throw new AppError('Player does not belong to this agent', 403);
      }

      const updateData: Record<string, any> = {};
      const currentMeta = (player.metadata as Record<string, any>) || {};

      if (data.displayName !== undefined) {
        updateData.displayName = data.displayName;
      }

      if (data.email !== undefined) {
        if (data.email) {
          const emailExists = await tx.user.findFirst({
            where: { email: data.email, id: { not: playerId } },
          });
          if (emailExists) {
            throw new AppError('Email already in use by another user', 400);
          }
        }
        updateData.email = data.email || null;
      }

      if (data.phone !== undefined) {
        if (data.phone) {
          const phoneExists = await tx.user.findFirst({
            where: { phone: data.phone, id: { not: playerId } },
          });
          if (phoneExists) {
            throw new AppError('Phone already in use by another user', 400);
          }
        }
        updateData.phone = data.phone || null;
      }

      if (data.remark !== undefined) {
        updateData.metadata = {
          ...currentMeta,
          remark: data.remark,
        };
      }

      // Handle credit limit change with agent balance adjustment
      let agentBalanceChange = 0;
      let agentRemainingLimit = 0;

      if (data.creditLimit !== undefined) {
        const oldLimit = player.creditLimit.toNumber();
        const newLimit = data.creditLimit;
        const diff = newLimit - oldLimit;

        if (diff !== 0) {
          const agent = await tx.agent.findUnique({
            where: { id: agentId },
            select: { balance: true },
          });

          if (!agent) {
            throw new AppError('Agent not found', 404);
          }

          if (diff > 0) {
            // Increasing limit: deduct from agent balance
            if (agent.balance.toNumber() < diff) {
              throw new AppError(
                `Insufficient agent balance. Available: ${agent.balance.toNumber()}, Required: ${diff}`,
                400
              );
            }

            await tx.agent.update({
              where: { id: agentId },
              data: { balance: agent.balance.toNumber() - diff },
            });

            agentBalanceChange = -diff;
            agentRemainingLimit = agent.balance.toNumber() - diff;
          } else {
            // Decreasing limit: add back to agent balance
            await tx.agent.update({
              where: { id: agentId },
              data: { balance: agent.balance.toNumber() + Math.abs(diff) },
            });

            agentBalanceChange = Math.abs(diff);
            agentRemainingLimit = agent.balance.toNumber() + Math.abs(diff);
          }

          updateData.creditLimit = newLimit;
        }
      }

      const updated = await tx.user.update({
        where: { id: playerId },
        data: updateData,
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          phone: true,
          creditLimit: true,
          balance: true,
          metadata: true,
        },
      });

      logger.info(`Player ${playerId} info updated by agent ${agentId}`, {
        changes: Object.keys(updateData),
      });

      return {
        player: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          email: updated.email,
          phone: updated.phone,
          creditLimit: updated.creditLimit.toNumber(),
          balance: updated.balance.toNumber(),
          remark: (updated.metadata as Record<string, any>)?.remark || null,
        },
        agentBalanceChange,
        agentRemainingBalance: agentRemainingLimit,
      };
    });
  }

  // ============================================
  // 5. Change Player Password
  // ============================================

  async changePlayerPassword(
    agentId: string,
    playerId: string,
    newPassword?: string
  ) {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentId: true, username: true },
    });

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    if (player.agentId !== agentId) {
      throw new AppError('Player does not belong to this agent', 403);
    }

    // Auto-generate password if none provided
    const password = newPassword || this.generateRandomPassword();
    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: playerId },
      data: { password: hashedPassword },
    });

    logger.info(`Player ${playerId} password changed by agent ${agentId}`);

    const shareMessage = `Your Stake111 login:\n\uD83D\uDD17 stake111.co\n\uD83D\uDC64 ID: ${player.username}\n\uD83D\uDD11 Password: ${password}\nGood luck! \uD83C\uDFCF`;

    return {
      playerId: player.id,
      username: player.username,
      newPassword: password,
      shareMessage,
    };
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // ============================================
  // 6. Single Player Report
  // ============================================

  async getPlayerReport(
    agentId: string,
    playerId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      type?: 'all' | 'bets' | 'transactions' | 'commissions';
    }
  ) {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        agentId: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        balance: true,
        creditLimit: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        metadata: true,
      },
    });

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    if (player.agentId !== agentId) {
      throw new AppError('Player does not belong to this agent', 403);
    }

    const dateFilter: Record<string, any> = {};
    if (filters.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const createdAtFilter = Object.keys(dateFilter).length > 0
      ? { createdAt: dateFilter }
      : {};

    const reportType = filters.type || 'all';

    // Bet stats
    let betStats = { totalBets: 0, won: 0, lost: 0, pending: 0, totalAmount: 0, totalWinnings: 0 };
    let bets: any[] = [];

    if (reportType === 'all' || reportType === 'bets') {
      bets = await prisma.bet.findMany({
        where: {
          userId: playerId,
          ...createdAtFilter,
        },
        include: {
          match: {
            select: { id: true, name: true, team1: true, team2: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      betStats = {
        totalBets: bets.length,
        won: bets.filter((b) => b.status === 'WON').length,
        lost: bets.filter((b) => b.status === 'LOST').length,
        pending: bets.filter((b) => b.status === 'PENDING').length,
        totalAmount: bets.reduce((sum, b) => sum + b.amount.toNumber(), 0),
        totalWinnings: bets
          .filter((b) => b.status === 'WON')
          .reduce((sum, b) => sum + (b.actualWin?.toNumber() || b.potentialWin.toNumber()), 0),
      };
    }

    // Transactions
    let transactions: any[] = [];
    if (reportType === 'all' || reportType === 'transactions') {
      transactions = await prisma.transaction.findMany({
        where: {
          userId: playerId,
          ...createdAtFilter,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          description: true,
          createdAt: true,
        },
      });
    }

    // Commissions (bets by this player that generated commissions for the agent)
    let commissions: any[] = [];
    if (reportType === 'all' || reportType === 'commissions') {
      commissions = await prisma.commission.findMany({
        where: {
          agentId,
          bet: {
            userId: playerId,
          },
          ...createdAtFilter,
        },
        include: {
          bet: {
            select: { id: true, betType: true, betOn: true, amount: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const meta = (player.metadata as Record<string, any>) || {};

    return {
      player: {
        id: player.id,
        username: player.username,
        displayName: player.displayName,
        email: player.email,
        phone: player.phone,
        balance: player.balance.toNumber(),
        creditLimit: player.creditLimit.toNumber(),
        status: player.status,
        lastLoginAt: player.lastLoginAt,
        createdAt: player.createdAt,
        userLocked: meta.userLocked === true,
        betLocked: meta.betLocked === true,
        remark: meta.remark || null,
      },
      betStats,
      bets: reportType === 'all' || reportType === 'bets' ? bets.map((b) => ({
        id: b.id,
        matchId: b.matchId,
        matchName: b.match.name,
        betType: b.betType,
        betOn: b.betOn,
        amount: b.amount.toNumber(),
        odds: b.odds.toNumber(),
        potentialWin: b.potentialWin.toNumber(),
        actualWin: b.actualWin?.toNumber() || null,
        status: b.status,
        isBack: (b.metadata as Record<string, any>)?.isBack ?? null,
        createdAt: b.createdAt,
      })) : [],
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: t.amount.toNumber(),
        balanceBefore: t.balanceBefore.toNumber(),
        balanceAfter: t.balanceAfter.toNumber(),
        description: t.description,
        createdAt: t.createdAt,
      })),
      commissions: commissions.map((c) => ({
        id: c.id,
        betId: c.betId,
        betType: c.bet.betType,
        betOn: c.bet.betOn,
        betAmount: c.bet.amount.toNumber(),
        commissionAmount: c.commissionAmount.toNumber(),
        commissionRate: c.commissionRate.toNumber(),
        paid: c.paid,
        createdAt: c.createdAt,
      })),
    };
  }

  // ============================================
  // 7a. Match & Session Position
  // ============================================

  async getMatchPosition(agentId: string, matchId: string) {
    const players = await prisma.user.findMany({
      where: { agentId },
      select: { id: true, username: true, displayName: true },
    });

    if (players.length === 0) {
      return { matchId, players: [] };
    }

    const playerIds = players.map((p) => p.id);

    const bets = await prisma.bet.findMany({
      where: {
        matchId,
        userId: { in: playerIds },
      },
      select: {
        userId: true,
        betType: true,
        betOn: true,
        amount: true,
        odds: true,
        potentialWin: true,
        actualWin: true,
        status: true,
        metadata: true,
      },
    });

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, name: true, team1: true, team2: true, status: true },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    // Group bets by player
    const playerMap = new Map<string, typeof bets>();
    for (const bet of bets) {
      const existing = playerMap.get(bet.userId) || [];
      existing.push(bet);
      playerMap.set(bet.userId, existing);
    }

    const playerPositions = players.map((player) => {
      const playerBets = playerMap.get(player.id) || [];

      // Separate match winner bets and session/fancy bets
      const matchBets = playerBets.filter(
        (b) => b.betType === 'MATCH_WINNER'
      );
      const sessionBets = playerBets.filter(
        (b) => b.betType === 'SESSION' || b.betType === 'FANCY'
      );

      // Calculate match position
      let backTotal = 0;
      let layTotal = 0;
      let matchPnl = 0;

      for (const bet of matchBets) {
        const meta = (bet.metadata as Record<string, any>) || {};
        const isBack = meta.isBack === true;
        const amount = bet.amount.toNumber();

        if (isBack) {
          backTotal += amount;
        } else {
          layTotal += amount;
        }

        if (bet.status === 'WON') {
          matchPnl += (bet.actualWin?.toNumber() || bet.potentialWin.toNumber());
        } else if (bet.status === 'LOST') {
          matchPnl -= amount;
        }
      }

      // Calculate session position
      let sessionPnl = 0;
      for (const bet of sessionBets) {
        if (bet.status === 'WON') {
          sessionPnl += (bet.actualWin?.toNumber() || bet.potentialWin.toNumber());
        } else if (bet.status === 'LOST') {
          sessionPnl -= bet.amount.toNumber();
        }
      }

      return {
        playerId: player.id,
        username: player.username,
        displayName: player.displayName,
        matchBets: {
          totalBets: matchBets.length,
          backTotal,
          layTotal,
          netPosition: backTotal - layTotal,
          pnl: matchPnl,
        },
        sessionBets: {
          totalBets: sessionBets.length,
          pnl: sessionPnl,
        },
        totalPnl: matchPnl + sessionPnl,
      };
    });

    return {
      match,
      players: playerPositions.sort((a, b) => b.totalPnl - a.totalPnl),
    };
  }

  // ============================================
  // 7b. Session Plus/Minus per Fancy Market
  // ============================================

  async getSessionPlusMinus(agentId: string, matchId: string) {
    const players = await prisma.user.findMany({
      where: { agentId },
      select: { id: true },
    });

    const playerIds = players.map((p) => p.id);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, name: true, team1: true, team2: true, status: true },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    // Get all session/fancy bets for this match by the agent's players
    const sessionBets = await prisma.bet.findMany({
      where: {
        matchId,
        userId: { in: playerIds },
        betType: { in: ['SESSION', 'FANCY'] },
      },
      select: {
        id: true,
        userId: true,
        betOn: true,
        amount: true,
        odds: true,
        potentialWin: true,
        actualWin: true,
        status: true,
        metadata: true,
        createdAt: true,
        user: {
          select: { username: true },
        },
      },
    });

    // Group by fancy market (betOn field or fancyMarketId from metadata)
    const marketMap = new Map<string, typeof sessionBets>();
    for (const bet of sessionBets) {
      const meta = (bet.metadata as Record<string, any>) || {};
      const marketKey = meta.fancyMarketId || meta.fancyMarketName || bet.betOn;
      const existing = marketMap.get(marketKey) || [];
      existing.push(bet);
      marketMap.set(marketKey, existing);
    }

    const markets = Array.from(marketMap.entries()).map(([marketName, bets]) => {
      let yesTotal = 0;
      let noTotal = 0;
      let yesBets = 0;
      let noBets = 0;
      let netExposure = 0;

      for (const bet of bets) {
        const meta = (bet.metadata as Record<string, any>) || {};
        const isBack = meta.isBack === true;
        const amount = bet.amount.toNumber();

        if (isBack) {
          yesTotal += amount;
          yesBets++;
        } else {
          noTotal += amount;
          noBets++;
        }

        if (bet.status === 'WON') {
          netExposure += (bet.actualWin?.toNumber() || bet.potentialWin.toNumber());
        } else if (bet.status === 'LOST') {
          netExposure -= amount;
        }
      }

      return {
        marketName,
        totalBets: bets.length,
        yesBets,
        noBets,
        yesTotal,
        noTotal,
        netExposure,
        bets: bets.map((b) => ({
          id: b.id,
          username: b.user.username,
          betOn: b.betOn,
          amount: b.amount.toNumber(),
          odds: b.odds.toNumber(),
          isBack: ((b.metadata as Record<string, any>) || {}).isBack ?? null,
          status: b.status,
          potentialWin: b.potentialWin.toNumber(),
          actualWin: b.actualWin?.toNumber() || null,
          createdAt: b.createdAt,
        })),
      };
    });

    return {
      match,
      totalMarkets: markets.length,
      markets,
    };
  }

  // ============================================
  // 7c. Match Winner Bets for a Match
  // ============================================

  async getMatchBets(agentId: string, matchId: string) {
    const players = await prisma.user.findMany({
      where: { agentId },
      select: { id: true },
    });

    const playerIds = players.map((p) => p.id);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, name: true, team1: true, team2: true, status: true },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    const bets = await prisma.bet.findMany({
      where: {
        matchId,
        userId: { in: playerIds },
        betType: 'MATCH_WINNER',
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      totalBets: bets.length,
      totalAmount: bets.reduce((sum, b) => sum + b.amount.toNumber(), 0),
      team1Bets: bets.filter((b) => b.betOn === match.team1).length,
      team2Bets: bets.filter((b) => b.betOn === match.team2).length,
      team1Amount: bets
        .filter((b) => b.betOn === match.team1)
        .reduce((sum, b) => sum + b.amount.toNumber(), 0),
      team2Amount: bets
        .filter((b) => b.betOn === match.team2)
        .reduce((sum, b) => sum + b.amount.toNumber(), 0),
    };

    return {
      match,
      summary,
      bets: bets.map((b) => ({
        id: b.id,
        playerId: b.user.id,
        username: b.user.username,
        displayName: b.user.displayName,
        betOn: b.betOn,
        isBack: ((b.metadata as Record<string, any>) || {}).isBack ?? null,
        amount: b.amount.toNumber(),
        odds: b.odds.toNumber(),
        potentialWin: b.potentialWin.toNumber(),
        actualWin: b.actualWin?.toNumber() || null,
        status: b.status,
        createdAt: b.createdAt,
      })),
    };
  }

  // ============================================
  // 7d. Session/Fancy Bets for a Match
  // ============================================

  async getSessionBets(agentId: string, matchId: string) {
    const players = await prisma.user.findMany({
      where: { agentId },
      select: { id: true },
    });

    const playerIds = players.map((p) => p.id);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, name: true, team1: true, team2: true, status: true },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    const bets = await prisma.bet.findMany({
      where: {
        matchId,
        userId: { in: playerIds },
        betType: { in: ['SESSION', 'FANCY'] },
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      totalBets: bets.length,
      totalAmount: bets.reduce((sum, b) => sum + b.amount.toNumber(), 0),
      pendingBets: bets.filter((b) => b.status === 'PENDING').length,
      settledBets: bets.filter((b) => b.status !== 'PENDING').length,
    };

    return {
      match,
      summary,
      bets: bets.map((b) => {
        const meta = (b.metadata as Record<string, any>) || {};
        return {
          id: b.id,
          playerId: b.user.id,
          username: b.user.username,
          displayName: b.user.displayName,
          betType: b.betType,
          betOn: b.betOn,
          isBack: meta.isBack ?? null,
          fancyMarketId: meta.fancyMarketId || null,
          fancyMarketName: meta.fancyMarketName || null,
          amount: b.amount.toNumber(),
          odds: b.odds.toNumber(),
          potentialWin: b.potentialWin.toNumber(),
          actualWin: b.actualWin?.toNumber() || null,
          status: b.status,
          createdAt: b.createdAt,
        };
      }),
    };
  }

  // ============================================
  // 8. Enhanced Client Ledger with Filters
  // ============================================

  async getClientLedgerFiltered(
    agentId: string,
    filters: {
      clientId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    // Build player query
    const playerWhere: Record<string, any> = { agentId };
    if (filters.clientId) {
      playerWhere.id = filters.clientId;
    }

    const players = await prisma.user.findMany({
      where: playerWhere,
      select: {
        id: true,
        username: true,
        displayName: true,
        balance: true,
        creditLimit: true,
        status: true,
      },
    });

    if (filters.clientId && players.length === 0) {
      throw new AppError('Player not found or does not belong to this agent', 404);
    }

    const dateFilter: Record<string, any> = {};
    if (filters.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const createdAtFilter = Object.keys(dateFilter).length > 0
      ? { createdAt: dateFilter }
      : {};

    const playerIds = players.map((p) => p.id);

    // Get all bets for these players within date range
    const bets = await prisma.bet.findMany({
      where: {
        userId: { in: playerIds },
        status: { in: ['WON', 'LOST'] },
        ...createdAtFilter,
      },
      select: {
        userId: true,
        amount: true,
        actualWin: true,
        potentialWin: true,
        status: true,
      },
    });

    // Get commissions earned from these players
    const commissions = await prisma.commission.findMany({
      where: {
        agentId,
        bet: {
          userId: { in: playerIds },
        },
        ...createdAtFilter,
      },
      select: {
        commissionAmount: true,
        bet: {
          select: { userId: true },
        },
      },
    });

    // Build per-player ledger
    const ledger = players.map((player) => {
      const playerBets = bets.filter((b) => b.userId === player.id);
      const playerCommissions = commissions.filter(
        (c) => c.bet.userId === player.id
      );

      let totalStaked = 0;
      let totalWonByPlayer = 0;
      let totalLostByPlayer = 0;

      for (const bet of playerBets) {
        const amount = bet.amount.toNumber();
        if (bet.status === 'WON') {
          totalWonByPlayer += (bet.actualWin?.toNumber() || bet.potentialWin.toNumber());
          totalStaked += amount;
        } else if (bet.status === 'LOST') {
          totalLostByPlayer += amount;
          totalStaked += amount;
        }
      }

      const totalCommission = playerCommissions.reduce(
        (sum, c) => sum + c.commissionAmount.toNumber(),
        0
      );

      // Net from agent perspective:
      // Agent gains when player loses, agent pays when player wins
      // Positive = agent needs to receive, Negative = agent needs to pay
      const netPnl = totalLostByPlayer - totalWonByPlayer;
      const netAfterCommission = netPnl - totalCommission;

      return {
        playerId: player.id,
        username: player.username,
        displayName: player.displayName,
        balance: player.balance.toNumber(),
        creditLimit: player.creditLimit.toNumber(),
        status: player.status,
        totalBets: playerBets.length,
        totalStaked,
        totalWonByPlayer,
        totalLostByPlayer,
        totalCommission,
        netPnl,
        netAfterCommission,
        // Positive = agent receives from client, Negative = agent pays to client
        agentAction: netAfterCommission >= 0 ? 'RECEIVE' : 'PAY',
        amount: Math.abs(netAfterCommission),
      };
    });

    const totals = {
      totalClients: ledger.length,
      totalAgentReceives: ledger
        .filter((l) => l.agentAction === 'RECEIVE')
        .reduce((sum, l) => sum + l.amount, 0),
      totalAgentPays: ledger
        .filter((l) => l.agentAction === 'PAY')
        .reduce((sum, l) => sum + l.amount, 0),
      netPosition: ledger.reduce((sum, l) => sum + l.netAfterCommission, 0),
    };

    return { ledger, totals };
  }

  // ============================================
  // 9. Player Commission Settings
  // ============================================

  async updatePlayerCommission(
    agentId: string,
    playerId: string,
    data: {
      matchCommission: number;
      sessionCommission: number;
      commissionType: 'BET_BY_BET' | 'LUMP_SUM' | 'NONE';
    }
  ) {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentId: true, username: true, metadata: true },
    });

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    if (player.agentId !== agentId) {
      throw new AppError('Player does not belong to this agent', 403);
    }

    if (data.matchCommission < 0 || data.matchCommission > 100) {
      throw new AppError('Match commission must be between 0 and 100', 400);
    }

    if (data.sessionCommission < 0 || data.sessionCommission > 100) {
      throw new AppError('Session commission must be between 0 and 100', 400);
    }

    const validTypes = ['BET_BY_BET', 'LUMP_SUM', 'NONE'];
    if (!validTypes.includes(data.commissionType)) {
      throw new AppError(
        `Invalid commission type. Must be one of: ${validTypes.join(', ')}`,
        400
      );
    }

    const currentMeta = (player.metadata as Record<string, any>) || {};

    const updated = await prisma.user.update({
      where: { id: playerId },
      data: {
        metadata: {
          ...currentMeta,
          commissionSettings: {
            matchCommission: data.matchCommission,
            sessionCommission: data.sessionCommission,
            commissionType: data.commissionType,
            updatedAt: new Date().toISOString(),
            updatedBy: agentId,
          },
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        metadata: true,
      },
    });

    logger.info(
      `Player ${playerId} commission settings updated by agent ${agentId}`,
      { commission: data }
    );

    const updatedMeta = (updated.metadata as Record<string, any>) || {};

    return {
      playerId: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      commissionSettings: updatedMeta.commissionSettings,
    };
  }

  // ============================================
  // 10. Agent Profile with Commission from Master
  // ============================================

  async getAgentProfile(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        agentType: true,
        status: true,
        balance: true,
        creditLimit: true,
        commissionRate: true,
        totalCommission: true,
        maxPlayersAllowed: true,
        maxExposure: true,
        lastLoginAt: true,
        createdAt: true,
        metadata: true,
        parentAgentId: true,
        parentAgent: {
          select: {
            id: true,
            username: true,
            displayName: true,
            agentType: true,
          },
        },
        _count: {
          select: { players: true, subAgents: true },
        },
      },
    });

    if (!agent) {
      throw new AppError('Agent not found', 404);
    }

    // Get commission totals
    const commissionAggregation = await prisma.commission.aggregate({
      where: { agentId },
      _sum: {
        commissionAmount: true,
      },
    });

    const unpaidCommissions = await prisma.commission.aggregate({
      where: { agentId, paid: false },
      _sum: {
        commissionAmount: true,
      },
    });

    const paidCommissions = await prisma.commission.aggregate({
      where: { agentId, paid: true },
      _sum: {
        commissionAmount: true,
      },
    });

    return {
      id: agent.id,
      username: agent.username,
      displayName: agent.displayName,
      email: agent.email,
      phone: agent.phone,
      agentType: agent.agentType,
      status: agent.status,
      balance: agent.balance.toNumber(),
      creditLimit: agent.creditLimit.toNumber(),
      maxPlayersAllowed: agent.maxPlayersAllowed,
      maxExposure: agent.maxExposure.toNumber(),
      lastLoginAt: agent.lastLoginAt,
      createdAt: agent.createdAt,
      totalPlayers: agent._count.players,
      totalSubAgents: agent._count.subAgents,
      parentAgent: agent.parentAgent
        ? {
            id: agent.parentAgent.id,
            username: agent.parentAgent.username,
            displayName: agent.parentAgent.displayName,
            agentType: agent.parentAgent.agentType,
          }
        : null,
      commission: {
        rateFromParent: agent.commissionRate.toNumber(),
        totalEarned: commissionAggregation._sum.commissionAmount?.toNumber() || 0,
        totalPaid: paidCommissions._sum.commissionAmount?.toNumber() || 0,
        pendingAmount: unpaidCommissions._sum.commissionAmount?.toNumber() || 0,
      },
    };
  }

  /**
   * Update a player's casino odds modifier
   * Positive values make odds more favorable to player (lower house edge)
   * Negative values make odds less favorable to player (higher house edge)
   * Range: -10 to +10 (percentage adjustment)
   */
  async updatePlayerCasinoOdds(agentId: string, playerId: string, modifier: number) {
    // Verify player belongs to this agent
    const player = await prisma.user.findFirst({
      where: { id: playerId, agentId },
    });

    if (!player) {
      throw new Error('Player not found or does not belong to this agent');
    }

    const updated = await prisma.user.update({
      where: { id: playerId },
      data: { casinoOddsModifier: modifier },
      select: {
        id: true,
        username: true,
        displayName: true,
        casinoOddsModifier: true,
      },
    });

    return updated;
  }
}

export default new AgentServiceAdditions();
