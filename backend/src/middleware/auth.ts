import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import prisma from '../db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    type: 'user' | 'agent';
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return errorResponse(res, 'No token provided', 401);
    }

    const decoded = verifyToken(token);

    if (decoded.type === 'agent') {
      const agent = await prisma.agent.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, agentType: true, status: true },
      });

      if (!agent || agent.status !== 'ACTIVE') {
        return errorResponse(res, 'Agent not found or inactive', 401);
      }

      req.user = {
        id: agent.id,
        username: agent.username,
        role: agent.agentType,
        type: 'agent',
      };
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, role: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        return errorResponse(res, 'User not found or inactive', 401);
      }

      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        type: 'user',
      };
    }

    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 'Forbidden: Insufficient permissions', 403);
    }

    next();
  };
};
