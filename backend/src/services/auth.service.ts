import prisma from '../db';
import { comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, TokenPayload } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import { config } from '../config';

class AuthService {
  async loginPlayer(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        displayName: true,
        role: true,
        status: true,
        balance: true,
        loginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 403);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError('Account is locked. Try again later', 423);
    }

    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: { increment: 1 },
          ...(user.loginAttempts + 1 >= config.maxLoginAttempts && {
            lockedUntil: new Date(Date.now() + config.lockoutDuration * 60 * 1000),
          }),
        },
      });
      throw new AppError('Invalid username or password', 401);
    }

    // Reset login attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const payload: TokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      type: 'user',
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.info(`Player logged in: ${user.username}`);

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        type: 'user' as const,
        balance: user.balance.toNumber(),
      },
    };
  }

  async loginAgent(username: string, password: string) {
    const agent = await prisma.agent.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        displayName: true,
        agentType: true,
        status: true,
        balance: true,
      },
    });

    if (!agent) {
      throw new AppError('Invalid username or password', 401);
    }

    if (agent.status !== 'ACTIVE') {
      throw new AppError('Account is not active', 403);
    }

    const isValid = await comparePassword(password, agent.password);

    if (!isValid) {
      throw new AppError('Invalid username or password', 401);
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: TokenPayload = {
      id: agent.id,
      username: agent.username,
      role: agent.agentType,
      type: 'agent',
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.info(`Agent logged in: ${agent.username}`);

    return {
      token,
      refreshToken,
      user: {
        id: agent.id,
        username: agent.username,
        displayName: agent.displayName,
        role: agent.agentType,
        type: 'agent' as const,
        balance: agent.balance.toNumber(),
      },
    };
  }

  async getMe(userId: string, userType: 'user' | 'agent') {
    if (userType === 'agent') {
      const agent = await prisma.agent.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          agentType: true,
          status: true,
          balance: true,
          creditLimit: true,
          commissionRate: true,
          totalCommission: true,
          kycVerified: true,
          lastLoginAt: true,
          _count: { select: { players: true, subAgents: true } },
        },
      });

      if (!agent) throw new AppError('Agent not found', 404);
      return { ...agent, type: 'agent' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        balance: true,
        creditLimit: true,
        lastLoginAt: true,
        _count: { select: { bets: true } },
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return { ...user, type: 'user' };
  }
}

export default new AuthService();
