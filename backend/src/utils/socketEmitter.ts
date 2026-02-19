import logger from '../config/logger';

// Lazy import to avoid circular dependency with server.ts
let ioInstance: any = null;

function getIO() {
  if (!ioInstance) {
    try {
      const { io } = require('../server');
      ioInstance = io;
    } catch {
      logger.warn('Socket.io not available yet');
      return null;
    }
  }
  return ioInstance;
}

/**
 * Emit event to a specific user's room
 */
export function emitToUser(userId: string, event: string, data: any) {
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
    logger.debug(`Socket emit to user:${userId} - ${event}`);
  }
}

/**
 * Emit event to a specific match room
 */
export function emitToMatch(matchId: string, event: string, data: any) {
  const io = getIO();
  if (io) {
    io.to(`match:${matchId}`).emit(event, data);
    logger.debug(`Socket emit to match:${matchId} - ${event}`);
  }
}

/**
 * Emit event to a specific admin/agent room
 */
export function emitToAdmin(agentId: string, event: string, data: any) {
  const io = getIO();
  if (io) {
    io.to(`admin:${agentId}`).emit(event, data);
    logger.debug(`Socket emit to admin:${agentId} - ${event}`);
  }
}

/**
 * Broadcast event to all connected clients
 */
export function broadcastAll(event: string, data: any) {
  const io = getIO();
  if (io) {
    io.emit(event, data);
    logger.debug(`Socket broadcast - ${event}`);
  }
}

// ============================================
// SPECIFIC EVENT EMITTERS
// ============================================

/**
 * Notify user of balance change
 */
export function emitBalanceUpdate(userId: string, newBalance: number | string, reason: string) {
  emitToUser(userId, 'balance:updated', {
    balance: newBalance,
    reason,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify user that their bet was settled
 */
export function emitBetSettled(userId: string, betData: {
  betId: string;
  status: string;
  actualWin: number | string;
  matchName: string;
}) {
  emitToUser(userId, 'bet:settled', {
    ...betData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast odds update for a match
 */
export function emitOddsUpdate(matchId: string, odds: {
  team1BackOdds?: number;
  team1LayOdds?: number;
  team2BackOdds?: number;
  team2LayOdds?: number;
  drawBackOdds?: number;
  drawLayOdds?: number;
}) {
  emitToMatch(matchId, 'odds:updated', {
    matchId,
    ...odds,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast match status change
 */
export function emitMatchStatusChange(matchId: string, status: string, data?: any) {
  broadcastAll('match:status', {
    matchId,
    status,
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify admin of new deposit request
 */
export function emitNewDeposit(agentId: string, depositData: {
  depositId: string;
  userId: string;
  username: string;
  amount: number | string;
}) {
  emitToAdmin(agentId, 'deposit:new', {
    ...depositData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify admin of new withdrawal request
 */
export function emitNewWithdrawal(agentId: string, withdrawalData: {
  withdrawalId: string;
  userId: string;
  username: string;
  amount: number | string;
}) {
  emitToAdmin(agentId, 'withdrawal:new', {
    ...withdrawalData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify user that deposit was approved/rejected
 */
export function emitDepositStatus(userId: string, data: {
  depositId: string;
  status: string;
  amount: number | string;
}) {
  emitToUser(userId, 'deposit:status', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify user that withdrawal was approved/rejected
 */
export function emitWithdrawalStatus(userId: string, data: {
  withdrawalId: string;
  status: string;
  amount: number | string;
}) {
  emitToUser(userId, 'withdrawal:status', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify master admin of new settlement
 */
export function emitSettlementGenerated(data: {
  settlementId: string;
  agentId: string;
  agentName: string;
  amount: number | string;
}) {
  broadcastAll('settlement:generated', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast match score update
 */
export function emitScoreUpdate(matchId: string, scores: {
  matchId?: string;
  team1Score?: string | null;
  team2Score?: string | null;
  statusText?: string | null;
  recentBalls?: string[];
  runRate?: string | null;
  requiredRunRate?: string | null;
  battingTeam?: string | null;
  team1Short?: string | null;
  team2Short?: string | null;
}) {
  emitToMatch(matchId, 'score:updated', {
    matchId,
    ...scores,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// CASINO EVENT EMITTERS
// ============================================

/**
 * Emit casino game result to a user
 */
export function emitCasinoResult(userId: string, data: {
  gameType: string;
  gameName: string;
  result: any;
  isWinner: boolean;
  actualWin: number;
  newBalance: number;
}) {
  emitToUser(userId, 'casino:result', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast a casino round event (for multiplayer rounds)
 */
export function emitCasinoRoundEvent(gameId: string, event: string, data: any) {
  const io = getIO();
  if (io) {
    io.to(`casino:${gameId}`).emit(event, {
      gameId,
      ...data,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Socket emit to casino:${gameId} - ${event}`);
  }
}

// ============================================
// MARKET ALERT & BET VOID EMITTERS
// ============================================

/**
 * Broadcast market removal alert to match rooms and all connected clients
 */
export function emitMarketRemovalAlert(matchId: string, removedMarkets: Array<{ id: string; marketName: string }>) {
  emitToMatch(matchId, 'market:removed', {
    matchId,
    removedMarkets,
    timestamp: new Date().toISOString(),
  });

  broadcastAll('market:alert', {
    type: 'MARKET_REMOVED',
    matchId,
    removedMarkets,
    count: removedMarkets.length,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast bookmaker odds update for a match
 */
export function emitBookmakerUpdate(matchId: string, data: {
  bookmakerOdds: any;
  bookmakerSuspended: boolean;
}) {
  emitToMatch(matchId, 'bookmaker:updated', {
    matchId,
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit bet voided notification to a user
 */
export function emitBetVoided(userId: string, data: {
  betId: string;
  matchName: string;
  marketName?: string;
  reason: string;
  refundAmount: string;
}) {
  emitToUser(userId, 'bet:voided', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}
