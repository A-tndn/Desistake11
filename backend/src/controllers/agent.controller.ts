import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import agentService from '../services/agent.service';
import prisma from '../db';
import { hashPassword, comparePassword } from '../utils/password';

export const createAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const createdBy = req.user!.id;
  const data = { ...req.body, createdBy };
  const agent = await agentService.createAgent(data);
  successResponse(res, 'Agent created successfully', agent, 201);
});

export const createPlayer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const plainPassword = req.body.password;
  const player = await agentService.createPlayer(agentId, req.body);
  // Return plain password so agent can share with player
  successResponse(res, 'Player created successfully', { ...player, plainPassword }, 201);
});

export const transferCredit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { playerId, amount } = req.body;
  const result = await agentService.transferCredit(agentId, playerId, parseFloat(amount));
  successResponse(res, 'Credit transferred successfully', result);
});

export const deductCredit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { playerId, amount } = req.body;
  const result = await agentService.deductCredit(agentId, playerId, parseFloat(amount));
  successResponse(res, 'Credit deducted successfully', result);
});

export const getPlayers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const players = await agentService.getAgentPlayers(agentId);
  successResponse(res, 'Players retrieved successfully', players);
});

export const getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const stats = await agentService.getAgentStats(agentId);
  successResponse(res, 'Stats retrieved successfully', stats);
});

export const getHierarchy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const hierarchy = await agentService.getAgentHierarchy(agentId);
  successResponse(res, 'Hierarchy retrieved successfully', hierarchy);
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true, username: true, displayName: true, email: true, phone: true,
      agentType: true, balance: true, creditLimit: true, commissionRate: true,
      status: true, maxPlayersAllowed: true, sportSharePercent: true,
      createdAt: true, lastLoginAt: true,
      _count: { select: { players: true, subAgents: true } },
    },
  });
  if (!agent) return errorResponse(res, 'Agent not found', 404);
  successResponse(res, 'Profile retrieved', {
    ...agent,
    balance: agent.balance.toNumber(),
    creditLimit: agent.creditLimit.toNumber(),
    commissionRate: agent.commissionRate.toNumber(),
    playerCount: agent._count.players,
    subAgentCount: agent._count.subAgents,
  });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { oldPassword, newPassword } = req.body;
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return errorResponse(res, 'Agent not found', 404);
  const isMatch = await comparePassword(oldPassword, agent.password);
  if (!isMatch) return errorResponse(res, 'Current password is incorrect', 400);
  const hashed = await hashPassword(newPassword);
  await prisma.agent.update({ where: { id: agentId }, data: { password: hashed } });
  successResponse(res, 'Password changed successfully');
});

export const changePlayerPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { playerId } = req.params;
  const { newPassword } = req.body;
  const player = await prisma.user.findUnique({ where: { id: playerId }, select: { agentId: true, username: true } });
  if (!player || player.agentId !== agentId) return errorResponse(res, 'Player not found or unauthorized', 404);
  const password = newPassword || Math.random().toString(36).slice(-8) + 'A1!';
  const hashed = await hashPassword(password);
  await prisma.user.update({ where: { id: playerId }, data: { password: hashed } });
  successResponse(res, 'Password changed', { password, username: player.username });
});

export const getAccountStatement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { userId, from, to } = req.query;

  const where: any = {};
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId as string }, select: { agentId: true } });
    if (!user || user.agentId !== agentId) return errorResponse(res, 'User not found', 404);
    where.userId = userId;
  } else {
    where.agentId = agentId;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string + 'T23:59:59.999Z');
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  });

  successResponse(res, 'Account statement retrieved', transactions);
});

export const getCurrentBets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { matchId } = req.query;

  const playerIds = await prisma.user.findMany({ where: { agentId }, select: { id: true } });
  const ids = playerIds.map(p => p.id);

  const where: any = { userId: { in: ids }, status: 'PENDING' };
  if (matchId) where.matchId = matchId;

  const bets = await prisma.bet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, username: true, displayName: true } },
      match: { select: { id: true, name: true, team1: true, team2: true, status: true } },
    },
  });

  successResponse(res, 'Current bets retrieved', bets);
});

export const getMatchBetsForAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const matchId = req.params.matchId;

  const playerIds = await prisma.user.findMany({ where: { agentId }, select: { id: true } });
  const ids = playerIds.map(p => p.id);

  const bets = await prisma.bet.findMany({
    where: { userId: { in: ids }, matchId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  });

  // Calculate ladder/position summary
  const ladder: Record<string, { team: string; totalBack: number; totalLay: number; net: number }> = {};
  for (const bet of bets) {
    const key = bet.betOn || 'Unknown';
    if (!ladder[key]) ladder[key] = { team: key, totalBack: 0, totalLay: 0, net: 0 };
    const amt = Number(bet.amount);
    if (bet.isBack) {
      ladder[key].totalBack += amt;
      ladder[key].net += amt * (Number(bet.odds) - 1);
    } else {
      ladder[key].totalLay += amt;
      ladder[key].net -= amt * (Number(bet.odds) - 1);
    }
  }

  successResponse(res, 'Match bets retrieved', { bets, ladder: Object.values(ladder) });
});

export const getCasinoDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { page = '1', limit = '20' } = req.query;

  const playerIds = await prisma.user.findMany({ where: { agentId }, select: { id: true } });
  const ids = playerIds.map(p => p.id);

  const where: any = { userId: { in: ids } };
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [bets, total] = await Promise.all([
    prisma.casinoBet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        round: { include: { game: { select: { gameName: true, gameType: true } } } },
      },
    }),
    prisma.casinoBet.count({ where }),
  ]);

  successResponse(res, 'Casino details retrieved', { bets, total, page: parseInt(page as string) });
});

// ── Bet History ───────────────────────────────────────────────────────────
export const getBetHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { from, to, status } = req.query;

  const playerIds = await prisma.user.findMany({ where: { agentId }, select: { id: true } });
  const ids = playerIds.map(p => p.id);
  if (ids.length === 0) return successResponse(res, 'Bet history retrieved', []);

  const where: any = { userId: { in: ids } };
  if (status && status !== 'ALL') where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string + 'T23:59:59.999Z');
  }

  const bets = await prisma.bet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { id: true, username: true, displayName: true } },
      match: { select: { id: true, name: true, team1: true, team2: true } },
    },
  });

  successResponse(res, 'Bet history retrieved', bets);
});

// ── My Ledger (Agent's own transactions) ──────────────────────────────────
export const getMyLedger = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { from, to } = req.query;

  const where: any = { agentId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string + 'T23:59:59.999Z');
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  successResponse(res, 'My ledger retrieved', transactions);
});

// ── Commission Report ─────────────────────────────────────────────────────
export const getCommissionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { from, to } = req.query;

  const where: any = { agentId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from as string);
    if (to) where.createdAt.lte = new Date(to as string + 'T23:59:59.999Z');
  }

  const commissions = await prisma.commission.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      bet: {
        include: {
          user: { select: { id: true, username: true, displayName: true } },
          match: { select: { id: true, name: true } },
        },
      },
    },
  });

  successResponse(res, 'Commission report retrieved', commissions);
});

// ── Client Ledger ─────────────────────────────────────────────────────────
export const getClientLedger = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { playerId } = req.query;

  if (playerId) {
    const player = await prisma.user.findUnique({ where: { id: playerId as string }, select: { agentId: true } });
    if (!player || player.agentId !== agentId) return errorResponse(res, 'Player not found', 404);
  }

  const playerIds = playerId
    ? [playerId as string]
    : (await prisma.user.findMany({ where: { agentId }, select: { id: true } })).map(p => p.id);

  if (playerIds.length === 0) return successResponse(res, 'Client ledger retrieved', { entries: [], summary: { totalCredit: 0, totalDebit: 0, netAmount: 0 } });

  const transactions = await prisma.transaction.findMany({
    where: { userId: { in: playerIds } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  });

  const creditTypes = ['DEPOSIT', 'BET_WON', 'CREDIT_TRANSFER', 'BET_REFUND', 'COMMISSION_EARNED'];
  let totalCredit = 0, totalDebit = 0;
  for (const t of transactions) {
    const amt = Number(t.amount);
    if (creditTypes.includes(t.type)) totalCredit += amt;
    else totalDebit += amt;
  }

  successResponse(res, 'Client ledger retrieved', {
    entries: transactions,
    summary: { totalCredit, totalDebit, netAmount: totalCredit - totalDebit },
  });
});

// ── Banners ───────────────────────────────────────────────────────────────
export const getBanners = asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await prisma.systemSettings.findFirst();
  const banners = settings?.welcomeBanner ? [{ id: '1', title: 'Welcome Banner', content: settings.welcomeBanner, isActive: true }] : [];
  successResponse(res, 'Banners retrieved', banners);
});

// ── Cash Transactions (using Transaction model with referenceType) ────────
export const createCashTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { clientId, amount, paymentType, remark } = req.body;

  const player = await prisma.user.findUnique({ where: { id: clientId }, select: { agentId: true, balance: true, username: true } });
  if (!player || player.agentId !== agentId) return errorResponse(res, 'Player not found', 404);

  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { balance: true } });
  if (!agent) return errorResponse(res, 'Agent not found', 404);

  const tx = await prisma.transaction.create({
    data: {
      agentId,
      userId: clientId,
      type: 'DEPOSIT',
      status: 'COMPLETED',
      amount: Math.abs(amount),
      balanceBefore: player.balance,
      balanceAfter: player.balance.toNumber() + Math.abs(amount),
      referenceType: `cash_${paymentType?.toLowerCase() || 'cash'}`,
      processedBy: agentId,
      processedAt: new Date(),
      description: remark || `Cash ${paymentType} transaction`,
    },
  });

  await prisma.user.update({
    where: { id: clientId },
    data: { balance: { increment: Math.abs(amount) } },
  });

  successResponse(res, 'Cash transaction created', tx, 201);
});

export const getCashTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;

  const transactions = await prisma.transaction.findMany({
    where: {
      agentId,
      referenceType: { startsWith: 'cash_' },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  });

  successResponse(res, 'Cash transactions retrieved', transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    client: t.user,
    paymentType: t.referenceType?.replace('cash_', '').toUpperCase() || 'CASH',
  })));
});

// ── Commission Lena Dena ──────────────────────────────────────────────────
export const getCommissionLenaDena = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { clientId } = req.query;

  const playerIds = clientId
    ? [clientId as string]
    : (await prisma.user.findMany({ where: { agentId }, select: { id: true } })).map(p => p.id);

  if (playerIds.length === 0) return successResponse(res, 'Commission lena dena retrieved', []);

  // Verify ownership if specific client
  if (clientId) {
    const player = await prisma.user.findUnique({ where: { id: clientId as string }, select: { agentId: true } });
    if (!player || player.agentId !== agentId) return errorResponse(res, 'Player not found', 404);
  }

  const commissions = await prisma.commission.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      bet: {
        include: {
          user: { select: { id: true, username: true, displayName: true } },
          match: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Filter by client if specified
  const filtered = clientId
    ? commissions.filter(c => c.bet?.userId === clientId)
    : commissions;

  successResponse(res, 'Commission lena dena retrieved', filtered);
});

// ── Report Details ────────────────────────────────────────────────────────
export const getReportDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const agentId = req.user!.id;
  const { userId, reportType, startDate, endDate } = req.query;

  const playerIds = await prisma.user.findMany({ where: { agentId }, select: { id: true } });
  const ids = playerIds.map(p => p.id);

  if (userId) {
    if (!ids.includes(userId as string)) return errorResponse(res, 'User not in your downline', 403);
  }

  const targetIds = userId ? [userId as string] : ids;
  if (targetIds.length === 0) return successResponse(res, 'Report details retrieved', { bets: [], transactions: [] });

  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
    if (endDate) dateFilter.createdAt.lte = new Date(endDate as string + 'T23:59:59.999Z');
  }

  const [bets, transactions] = await Promise.all([
    reportType !== 'transactions' ? prisma.bet.findMany({
      where: { userId: { in: targetIds }, ...dateFilter },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        match: { select: { id: true, name: true } },
      },
    }) : [],
    reportType !== 'bets' ? prisma.transaction.findMany({
      where: { userId: { in: targetIds }, ...dateFilter },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
      },
    }) : [],
  ]);

  successResponse(res, 'Report details retrieved', { bets, transactions });
});
