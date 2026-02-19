import { Request, Response, NextFunction } from 'express';
import { Permission } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import prisma from '../db';
import auditLogService from '../services/auditLog.service';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    type: 'user' | 'agent';
    permissions?: Permission[];
  };
}

/**
 * Core authentication middleware — validates JWT and attaches user to request
 */
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
        select: {
          id: true,
          username: true,
          agentType: true,
          status: true,
          permissions: true,
          userLocked: true,
        },
      });

      if (!agent || agent.status !== 'ACTIVE') {
        return errorResponse(res, 'Agent not found or inactive', 401);
      }

      if (agent.userLocked) {
        return errorResponse(res, 'Your account has been locked. Contact your administrator.', 403);
      }

      req.user = {
        id: agent.id,
        username: agent.username,
        role: agent.agentType,
        type: 'agent',
        permissions: agent.permissions,
      };
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          userLocked: true,
          betLocked: true,
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        return errorResponse(res, 'User not found or inactive', 401);
      }

      if (user.userLocked) {
        return errorResponse(res, 'Your account has been locked. Contact your agent.', 403);
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

/**
 * Role-based authorization — checks if user has one of the allowed roles
 */
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

/**
 * Permission-based authorization for agents — checks if agent has a specific permission
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    // Master admins and super admins bypass permission checks
    if (req.user.role === 'MASTER_ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Super masters bypass permission checks
    if (req.user.role === 'SUPER_MASTER') {
      return next();
    }

    // Check agent permissions
    if (req.user.type === 'agent' && req.user.permissions) {
      const hasPermission = requiredPermissions.every((p) =>
        req.user!.permissions!.includes(p)
      );

      if (!hasPermission) {
        return errorResponse(
          res,
          `Forbidden: Missing required permission(s): ${requiredPermissions.join(', ')}`,
          403
        );
      }

      return next();
    }

    return errorResponse(res, 'Forbidden: Insufficient permissions', 403);
  };
};

/**
 * Master admin only middleware
 */
export const masterAdminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  if (req.user.role !== 'MASTER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return errorResponse(res, 'Forbidden: Master admin access required', 403);
  }

  next();
};

/**
 * Agent-only middleware (any agent type)
 */
export const agentOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  if (req.user.type !== 'agent') {
    return errorResponse(res, 'Forbidden: Agent access required', 403);
  }

  next();
};

/**
 * Admin access middleware (agents OR master admin)
 */
export const adminAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  // Allow agents
  if (req.user.type === 'agent') {
    return next();
  }

  // Allow master admins and super admins
  if (req.user.role === 'MASTER_ADMIN' || req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  return errorResponse(res, 'Forbidden: Admin access required', 403);
};

/**
 * Check if user's betting is locked
 */
export const checkBetLock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return errorResponse(res, 'Unauthorized', 401);
  }

  if (req.user.type === 'user') {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { betLocked: true },
    });

    if (user?.betLocked) {
      return errorResponse(res, 'Betting is locked for your account', 403);
    }
  }

  next();
};

/**
 * IP logging middleware — logs IP address for all admin actions
 */
export const logAdminAction = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Log the action after the request is processed
    res.on('finish', async () => {
      if (req.user) {
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
        const userAgentStr = req.headers['user-agent'] || 'unknown';

        await auditLogService.log({
          userId: req.user.id,
          userType: req.user.type === 'agent' ? req.user.role : req.user.role,
          username: req.user.username,
          action,
          resource,
          resourceId: req.params.id || undefined,
          ipAddress,
          userAgent: userAgentStr,
          requestMethod: req.method,
          requestPath: req.originalUrl,
          status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
        });
      }
    });

    next();
  };
};

/**
 * Maintenance mode check middleware
 */
export const checkMaintenanceMode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings?.maintenanceMode) {
      // Allow master admin to bypass
      if (req.user?.role === 'MASTER_ADMIN' || req.user?.role === 'SUPER_ADMIN') {
        return next();
      }
      return errorResponse(res, 'Platform is under maintenance. Please try again later.', 503);
    }
    next();
  } catch {
    // If settings check fails, continue (don't block)
    next();
  }
};
