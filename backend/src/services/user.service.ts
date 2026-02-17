import prisma from '../db';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, comparePassword } from '../utils/password';
import logger from '../config/logger';

class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        balance: true,
        creditLimit: true,
        totalDeposited: true,
        totalWithdrawn: true,
        lastLoginAt: true,
        createdAt: true,
        agent: {
          select: { displayName: true, username: true },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) throw new AppError('User not found', 404);

    const isValid = await comparePassword(oldPassword, user.password);
    if (!isValid) throw new AppError('Current password is incorrect', 400);

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    logger.info(`Password changed for user ${userId}`);
    return { success: true };
  }

  async getTransactions(userId: string, filters: {
    type?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = { userId };

    if (filters.type && filters.type !== 'all') {
      where.type = filters.type;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) {
        const to = new Date(filters.toDate);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLedger(userId: string) {
    // Get all settled bets grouped by match
    const bets = await prisma.bet.findMany({
      where: {
        userId,
        status: { in: ['WON', 'LOST', 'CANCELLED'] },
      },
      include: {
        match: {
          select: {
            id: true,
            name: true,
            team1: true,
            team2: true,
            matchWinner: true,
            status: true,
            startTime: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by match
    const matchMap = new Map<string, any>();
    for (const bet of bets) {
      const matchId = bet.matchId;
      if (!matchMap.has(matchId)) {
        matchMap.set(matchId, {
          match: bet.match,
          bets: [],
          totalStaked: 0,
          totalWon: 0,
          totalLost: 0,
          profit: 0,
        });
      }
      const entry = matchMap.get(matchId)!;
      entry.bets.push(bet);
      const amount = Number(bet.amount);
      const won = Number(bet.actualWin || 0);

      if (bet.status === 'WON') {
        entry.totalWon += won;
        entry.profit += (won - amount);
      } else if (bet.status === 'LOST') {
        entry.totalLost += amount;
        entry.profit -= amount;
      }
      entry.totalStaked += amount;
    }

    const ledger = Array.from(matchMap.values());
    const totalProfit = ledger.reduce((sum, l) => sum + l.profit, 0);

    return { ledger, totalProfit };
  }

  async getCompletedGames(userId: string) {
    // Get completed matches where the user had bets
    const bets = await prisma.bet.findMany({
      where: { userId },
      include: {
        match: {
          select: {
            id: true,
            name: true,
            team1: true,
            team2: true,
            matchWinner: true,
            status: true,
            startTime: true,
            endTime: true,
            tournament: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by match, only completed
    const matchMap = new Map<string, any>();
    for (const bet of bets) {
      if (bet.match.status !== 'COMPLETED') continue;
      const matchId = bet.matchId;
      if (!matchMap.has(matchId)) {
        matchMap.set(matchId, {
          match: bet.match,
          matchBetsCount: 0,
          sessionBetsCount: 0,
          profit: 0,
        });
      }
      const entry = matchMap.get(matchId)!;
      const amount = Number(bet.amount);
      const won = Number(bet.actualWin || 0);

      if (bet.betType === 'SESSION' || bet.betType === 'FANCY') {
        entry.sessionBetsCount++;
      } else {
        entry.matchBetsCount++;
      }

      if (bet.status === 'WON') {
        entry.profit += (won - amount);
      } else if (bet.status === 'LOST') {
        entry.profit -= amount;
      }
    }

    return Array.from(matchMap.values());
  }
}

export default new UserService();
