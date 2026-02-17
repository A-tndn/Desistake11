import prisma from '../db';
import { AgentType, UserStatus, UserRole } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/password';
import logger from '../config/logger';

class AgentService {
  async createAgent(data: {
    username: string;
    email?: string;
    phone: string;
    password: string;
    displayName: string;
    agentType: AgentType;
    parentAgentId?: string;
    commissionRate: number;
    creditLimit: number;
    createdBy: string;
  }) {
    if (data.parentAgentId) {
      const parentAgent = await prisma.agent.findUnique({
        where: { id: data.parentAgentId },
        select: { agentType: true, status: true },
      });

      if (!parentAgent || parentAgent.status !== UserStatus.ACTIVE) {
        throw new AppError('Parent agent not found or inactive', 404);
      }

      if (data.agentType === AgentType.SUPER_MASTER) {
        throw new AppError('Super Master agents cannot have parent agents', 400);
      }

      if (data.agentType === AgentType.MASTER && parentAgent.agentType !== AgentType.SUPER_MASTER) {
        throw new AppError('Master agents can only be created by Super Master agents', 400);
      }

      if (data.agentType === AgentType.AGENT && parentAgent.agentType !== AgentType.MASTER) {
        throw new AppError('Regular agents can only be created by Master agents', 400);
      }
    }

    const existing = await prisma.agent.findFirst({
      where: {
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
          { phone: data.phone },
        ],
      },
    });

    if (existing) {
      throw new AppError('Username, email, or phone already exists', 400);
    }

    const hashedPassword = await hashPassword(data.password);

    const agent = await prisma.agent.create({
      data: {
        username: data.username,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        displayName: data.displayName,
        agentType: data.agentType,
        parentAgentId: data.parentAgentId,
        commissionRate: data.commissionRate,
        creditLimit: data.creditLimit,
        status: UserStatus.PENDING,
        createdBy: data.createdBy,
      },
    });

    logger.info(`Agent created: ${agent.id} by ${data.createdBy}`);

    return agent;
  }

  async createPlayer(
    agentId: string,
    data: {
      username: string;
      password: string;
      displayName: string;
      email?: string;
      phone?: string;
      creditLimit: number;
    }
  ) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { status: true, agentType: true, maxPlayersAllowed: true, _count: { select: { players: true } } },
    });

    if (!agent || agent.status !== UserStatus.ACTIVE) {
      throw new AppError('Agent not found or inactive', 404);
    }

    if (agent._count.players >= agent.maxPlayersAllowed) {
      throw new AppError(`Agent has reached maximum players limit (${agent.maxPlayersAllowed})`, 400);
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });

    if (existing) {
      throw new AppError('Username, email, or phone already exists', 400);
    }

    const hashedPassword = await hashPassword(data.password);

    const player = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        displayName: data.displayName,
        agentId,
        creditLimit: data.creditLimit,
        balance: 0,
        role: UserRole.PLAYER,
        status: UserStatus.ACTIVE,
        createdBy: agentId,
      },
    });

    logger.info(`Player created: ${player.id} by agent ${agentId}`);

    return player;
  }

  /**
   * Update player betting settings - MASTER AGENT ONLY
   * Regular agents cannot see or modify these settings
   */
  async updatePlayerBettingSettings(
    agentId: string,
    playerId: string,
    settings: {
      bookmakerDelay?: number;
      sessionDelay?: number;
      matchDelay?: number;
      bookmakerMinStack?: number;
      bookmakerMaxStack?: number;
      betDeleteAllowed?: boolean;
    }
  ) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { agentType: true, status: true },
    });

    if (!agent || agent.status !== UserStatus.ACTIVE) {
      throw new AppError('Agent not found or inactive', 404);
    }

    if (agent.agentType !== AgentType.MASTER && agent.agentType !== AgentType.SUPER_MASTER) {
      throw new AppError('Only Master Agents can modify player betting settings', 403);
    }

    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        agentId: true,
        agent: {
          select: { parentAgentId: true },
        },
      },
    });

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    const isDirectPlayer = player.agentId === agentId;
    const isSubAgentPlayer = player.agent?.parentAgentId === agentId;

    if (!isDirectPlayer && !isSubAgentPlayer) {
      throw new AppError('Player does not belong to your hierarchy', 403);
    }

    const updateData: any = {};
    if (settings.bookmakerDelay !== undefined) updateData.bookmakerDelay = settings.bookmakerDelay;
    if (settings.sessionDelay !== undefined) updateData.sessionDelay = settings.sessionDelay;
    if (settings.matchDelay !== undefined) updateData.matchDelay = settings.matchDelay;
    if (settings.bookmakerMinStack !== undefined) updateData.bookmakerMinStack = settings.bookmakerMinStack;
    if (settings.bookmakerMaxStack !== undefined) updateData.bookmakerMaxStack = settings.bookmakerMaxStack;
    if (settings.betDeleteAllowed !== undefined) updateData.betDeleteAllowed = settings.betDeleteAllowed;

    const updatedPlayer = await prisma.user.update({
      where: { id: playerId },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        bookmakerDelay: true,
        sessionDelay: true,
        matchDelay: true,
        bookmakerMinStack: true,
        bookmakerMaxStack: true,
        betDeleteAllowed: true,
      },
    });

    logger.info(`Player betting settings updated: ${playerId} by master agent ${agentId}`);

    return updatedPlayer;
  }

  async getPlayerBettingSettings(agentId: string, playerId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { agentType: true, status: true },
    });

    if (!agent || agent.status !== UserStatus.ACTIVE) {
      throw new AppError('Agent not found or inactive', 404);
    }

    if (agent.agentType !== AgentType.MASTER && agent.agentType !== AgentType.SUPER_MASTER) {
      throw new AppError('Only Master Agents can view player betting settings', 403);
    }

    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        username: true,
        displayName: true,
        bookmakerDelay: true,
        sessionDelay: true,
        matchDelay: true,
        bookmakerMinStack: true,
        bookmakerMaxStack: true,
        betDeleteAllowed: true,
        agent: { select: { parentAgentId: true } },
        agentId: true,
      },
    });

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    const isDirectPlayer = player.agentId === agentId;
    const isSubAgentPlayer = player.agent?.parentAgentId === agentId;

    if (!isDirectPlayer && !isSubAgentPlayer) {
      throw new AppError('Player does not belong to your hierarchy', 403);
    }

    return {
      id: player.id,
      username: player.username,
      displayName: player.displayName,
      bookmakerDelay: player.bookmakerDelay,
      sessionDelay: player.sessionDelay,
      matchDelay: player.matchDelay,
      bookmakerMinStack: player.bookmakerMinStack,
      bookmakerMaxStack: player.bookmakerMaxStack,
      betDeleteAllowed: player.betDeleteAllowed,
    };
  }

  async getMasterAgentAllPlayers(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { agentType: true, status: true },
    });

    if (!agent || agent.status !== UserStatus.ACTIVE) {
      throw new AppError('Agent not found or inactive', 404);
    }

    if (agent.agentType !== AgentType.MASTER && agent.agentType !== AgentType.SUPER_MASTER) {
      throw new AppError('Only Master Agents can view all hierarchy players', 403);
    }

    const subAgents = await prisma.agent.findMany({
      where: { parentAgentId: agentId },
      select: { id: true },
    });
    const subAgentIds = subAgents.map((a) => a.id);

    return await prisma.user.findMany({
      where: {
        agentId: { in: [agentId, ...subAgentIds] },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        balance: true,
        creditLimit: true,
        status: true,
        bookmakerDelay: true,
        sessionDelay: true,
        matchDelay: true,
        bookmakerMinStack: true,
        bookmakerMaxStack: true,
        betDeleteAllowed: true,
        agentId: true,
        agent: {
          select: { username: true, displayName: true },
        },
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async transferCredit(agentId: string, playerId: string, amount: number) {
    if (amount <= 0) {
      throw new AppError('Invalid transfer amount', 400);
    }

    return await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.findUnique({
        where: { id: agentId },
        select: { balance: true, status: true },
      });

      if (!agent || agent.status !== UserStatus.ACTIVE) {
        throw new AppError('Agent not found or inactive', 404);
      }

      if (agent.balance.toNumber() < amount) {
        throw new AppError('Insufficient agent balance', 400);
      }

      const player = await tx.user.findUnique({
        where: { id: playerId },
        select: { agentId: true, balance: true, status: true, username: true },
      });

      if (!player || player.status !== UserStatus.ACTIVE) {
        throw new AppError('Player not found or inactive', 404);
      }

      if (player.agentId !== agentId) {
        throw new AppError('Player does not belong to this agent', 403);
      }

      const newAgentBalance = agent.balance.toNumber() - amount;
      const newPlayerBalance = player.balance.toNumber() + amount;

      await tx.agent.update({
        where: { id: agentId },
        data: { balance: newAgentBalance },
      });

      await tx.user.update({
        where: { id: playerId },
        data: { balance: newPlayerBalance },
      });

      await tx.transaction.create({
        data: {
          agentId,
          type: 'DEBIT_TRANSFER',
          status: 'COMPLETED',
          amount,
          balanceBefore: agent.balance,
          balanceAfter: newAgentBalance,
          referenceId: playerId,
          referenceType: 'credit_transfer',
          processedBy: agentId,
          processedAt: new Date(),
          description: `Credit transferred to ${player.username}`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: playerId,
          type: 'CREDIT_TRANSFER',
          status: 'COMPLETED',
          amount,
          balanceBefore: player.balance,
          balanceAfter: newPlayerBalance,
          referenceType: 'credit_transfer',
          processedBy: agentId,
          processedAt: new Date(),
          description: 'Credit received from agent',
        },
      });

      logger.info(`Credit transferred: ${amount} from agent ${agentId} to player ${playerId}`);

      return { agentNewBalance: newAgentBalance, playerNewBalance: newPlayerBalance };
    });
  }

  async deductCredit(agentId: string, playerId: string, amount: number) {
    if (amount <= 0) {
      throw new AppError('Invalid deduction amount', 400);
    }

    return await prisma.$transaction(async (tx) => {
      const player = await tx.user.findUnique({
        where: { id: playerId },
        select: { agentId: true, balance: true, status: true, username: true },
      });

      if (!player || player.status !== UserStatus.ACTIVE) {
        throw new AppError('Player not found or inactive', 404);
      }

      if (player.agentId !== agentId) {
        throw new AppError('Player does not belong to this agent', 403);
      }

      if (player.balance.toNumber() < amount) {
        throw new AppError('Insufficient player balance', 400);
      }

      const agent = await tx.agent.findUnique({
        where: { id: agentId },
        select: { balance: true },
      });

      if (!agent) {
        throw new AppError('Agent not found', 404);
      }

      const newPlayerBalance = player.balance.toNumber() - amount;
      const newAgentBalance = agent.balance.toNumber() + amount;

      await tx.user.update({
        where: { id: playerId },
        data: { balance: newPlayerBalance },
      });

      await tx.agent.update({
        where: { id: agentId },
        data: { balance: newAgentBalance },
      });

      await tx.transaction.create({
        data: {
          userId: playerId,
          type: 'DEBIT_TRANSFER',
          status: 'COMPLETED',
          amount,
          balanceBefore: player.balance,
          balanceAfter: newPlayerBalance,
          referenceType: 'withdrawal',
          processedBy: agentId,
          processedAt: new Date(),
          description: 'Withdrawal by agent',
        },
      });

      await tx.transaction.create({
        data: {
          agentId,
          type: 'CREDIT_TRANSFER',
          status: 'COMPLETED',
          amount,
          balanceBefore: agent.balance,
          balanceAfter: newAgentBalance,
          referenceId: playerId,
          referenceType: 'withdrawal',
          processedBy: agentId,
          processedAt: new Date(),
          description: `Withdrawal from ${player.username}`,
        },
      });

      logger.info(`Credit deducted: ${amount} from player ${playerId} by agent ${agentId}`);

      return { agentNewBalance: newAgentBalance, playerNewBalance: newPlayerBalance };
    });
  }

  async getAgentPlayers(agentId: string) {
    return await prisma.user.findMany({
      where: { agentId },
      select: {
        id: true,
        username: true,
        displayName: true,
        balance: true,
        creditLimit: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAgentStats(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        players: {
          select: {
            id: true,
            balance: true,
            bets: {
              select: { amount: true, status: true },
            },
          },
        },
        commissionsEarned: {
          select: { commissionAmount: true, paid: true },
        },
      },
    });

    if (!agent) {
      throw new AppError('Agent not found', 404);
    }

    const totalPlayers = agent.players.length;
    const totalPlayersBalance = agent.players.reduce((sum, p) => sum + p.balance.toNumber(), 0);
    const totalBets = agent.players.reduce((sum, p) => sum + p.bets.length, 0);
    const totalBetsAmount = agent.players.reduce(
      (sum, p) => sum + p.bets.reduce((s, b) => s + b.amount.toNumber(), 0),
      0
    );
    const totalCommissions = agent.commissionsEarned.reduce((sum, c) => sum + c.commissionAmount.toNumber(), 0);
    const unpaidCommissions = agent.commissionsEarned
      .filter((c) => !c.paid)
      .reduce((sum, c) => sum + c.commissionAmount.toNumber(), 0);

    return {
      agentId: agent.id,
      agentType: agent.agentType,
      balance: agent.balance.toNumber(),
      totalCommissions,
      unpaidCommissions,
      stats: { totalPlayers, totalPlayersBalance, totalBets, totalBetsAmount },
    };
  }

  async getAgentHierarchy(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        subAgents: {
          include: { subAgents: true },
        },
        players: {
          select: { id: true, username: true, displayName: true, balance: true },
        },
      },
    });

    if (!agent) {
      throw new AppError('Agent not found', 404);
    }

    return agent;
  }
}

export default new AgentService();
