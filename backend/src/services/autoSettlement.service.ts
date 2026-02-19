import prisma from '../db';
import { MatchStatus, BetStatus, TransactionType, TransactionStatus } from '@prisma/client';
import logger from '../config/logger';
import resultFetcher, { MatchResult } from './resultFetcher.service';
import { emitMatchStatusChange } from '../utils/socketEmitter';

class AutoSettlementService {
  /**
   * Main entry: find COMPLETED matches missing result data, fetch and populate.
   * The existing betSettlement.job.ts will then settle the bets.
   */
  async processCompletedMatches(): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Find COMPLETED matches without matchWinner AND not yet settled
      // These are matches that scoreScraper marked COMPLETED but extractWinner returned null
      // OR matches that were manually marked COMPLETED by admin
      const matches = await prisma.match.findMany({
        where: {
          status: MatchStatus.COMPLETED,
          isSettled: false,
          matchWinner: null,
        },
        select: {
          id: true,
          name: true,
          team1: true,
          team2: true,
          endTime: true,
          matchType: true,
          _count: { select: { bets: true } },
        },
      });

      if (matches.length === 0) {
        logger.debug('[AutoSettlement] No COMPLETED matches need result fetching');
        return { processed: 0, errors: [] };
      }

      logger.info(`[AutoSettlement] Found ${matches.length} COMPLETED match(es) needing results`);

      for (const match of matches) {
        try {
          const result = await resultFetcher.fetchResult(match.team1, match.team2);

          if (!result) {
            // Check if match ended more than 2 hours ago - might be stale
            if (match.endTime && Date.now() - match.endTime.getTime() > 2 * 60 * 60 * 1000) {
              logger.warn(`[AutoSettlement] Match ${match.name} ended 2+ hours ago, no result found from APIs`);
            }
            continue;
          }

          if (result.noResult) {
            // No result / abandoned - void all bets
            await this.handleNoResult(match.id, match.name, result.resultText);
            processed++;
            continue;
          }

          if (result.isDraw) {
            // Draw (Test match) - match winner is 'DRAW'
            await this.handleDraw(match.id, match.name, result);
            processed++;
            continue;
          }

          if (result.isTie) {
            // Tie without super over - void all bets (rare)
            await this.handleTie(match.id, match.name, result.resultText);
            processed++;
            continue;
          }

          if (result.winner) {
            // Normal result - set matchWinner so betSettlement.job picks it up
            await this.populateMatchResult(match.id, match.name, result);
            processed++;
          }
        } catch (error: any) {
          const msg = `Match ${match.id} (${match.name}): ${error.message}`;
          errors.push(msg);
          logger.error(`[AutoSettlement] ${msg}`);
        }
      }
    } catch (error: any) {
      logger.error(`[AutoSettlement] processCompletedMatches failed: ${error.message}`);
      errors.push(error.message);
    }

    if (processed > 0) {
      logger.info(`[AutoSettlement] Processed ${processed} match(es)`);
    }

    return { processed, errors };
  }

  /**
   * Populate match with result data from API.
   * The existing betSettlement.job will then settle the bets.
   */
  private async populateMatchResult(matchId: string, matchName: string, result: MatchResult) {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        matchWinner: result.winner,
        winType: result.winType,
        winMargin: result.winMargin,
        tossWinner: result.tossWinner,
        tossDecision: result.tossDecision,
        team1Score: result.team1Score || undefined,
        team2Score: result.team2Score || undefined,
      },
    });

    logger.info(`[AutoSettlement] Match ${matchName}: winner=${result.winner}, source=${result.source}`);

    emitMatchStatusChange(matchId, 'COMPLETED', {
      winner: result.winner,
      resultText: result.resultText,
    });
  }

  /**
   * Handle no-result / abandoned match - void all pending bets
   */
  private async handleNoResult(matchId: string, matchName: string, resultText: string) {
    logger.info(`[AutoSettlement] No result for ${matchName}: "${resultText}" - voiding all bets`);

    const bets = await prisma.bet.findMany({
      where: { matchId, status: BetStatus.PENDING },
      include: { user: { select: { id: true, balance: true } } },
    });

    let refunded = 0;
    for (const bet of bets) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: BetStatus.VOID,
              settledAt: new Date(),
              settledBy: 'AUTO_SETTLEMENT',
              settlementNote: `No result: ${resultText}`,
            },
          });

          const balanceBefore = bet.user.balance;
          const balanceAfter = balanceBefore.add(bet.amount);

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
              processedBy: 'AUTO_SETTLEMENT',
              processedAt: new Date(),
              description: `Bet voided - Match ${matchName}: ${resultText}`,
            },
          });
        });
        refunded++;
      } catch (error: any) {
        logger.error(`[AutoSettlement] Failed to void bet ${bet.id}: ${error.message}`);
      }
    }

    // Also void all unsettled fancy markets
    await this.voidMatchFancyMarkets(matchId, `No result: ${resultText}`);

    // Mark match as settled
    await prisma.match.update({
      where: { id: matchId },
      data: {
        isSettled: true,
        settledAt: new Date(),
        settledBy: 'AUTO_SETTLEMENT',
      },
    });

    logger.info(`[AutoSettlement] Voided ${refunded}/${bets.length} bets for no-result match ${matchName}`);
  }

  /**
   * Handle draw (Test match) - betOn === team1/team2 LOSE, betOn === 'DRAW' WINS
   */
  private async handleDraw(matchId: string, matchName: string, result: MatchResult) {
    logger.info(`[AutoSettlement] Draw for ${matchName} - setting matchWinner=DRAW`);

    await prisma.match.update({
      where: { id: matchId },
      data: {
        matchWinner: 'DRAW',
        winType: 'draw',
        team1Score: result.team1Score || undefined,
        team2Score: result.team2Score || undefined,
        tossWinner: result.tossWinner,
        tossDecision: result.tossDecision,
      },
    });

    // The betSettlement.job will pick this up.
    // determineBetOutcome in bet.service.ts checks: bet.betOn === result.winner
    // So bets with betOn='DRAW' will win, bets on team1/team2 will lose.
    // This works because matchWinner is set to 'DRAW'.

    emitMatchStatusChange(matchId, 'COMPLETED', {
      winner: 'DRAW',
      resultText: result.resultText,
    });
  }

  /**
   * Handle tie without super over - void all bets
   */
  private async handleTie(matchId: string, matchName: string, resultText: string) {
    logger.info(`[AutoSettlement] Tie for ${matchName}: "${resultText}" - voiding all bets`);

    // Ties are extremely rare and typically no one bets on "TIE"
    // So we void all bets as a fair outcome
    await this.handleNoResult(matchId, matchName, resultText);
  }

  /**
   * Void all unsettled fancy markets for a match
   */
  private async voidMatchFancyMarkets(matchId: string, reason: string) {
    const unsettledMarkets = await prisma.fancyMarket.findMany({
      where: {
        matchId,
        isSettled: false,
      },
      select: { id: true, marketName: true },
    });

    for (const market of unsettledMarkets) {
      try {
        await this.voidFancyMarket(market.id, reason);
      } catch (error: any) {
        logger.error(`[AutoSettlement] Failed to void fancy market ${market.id}: ${error.message}`);
      }
    }

    if (unsettledMarkets.length > 0) {
      logger.info(`[AutoSettlement] Voided ${unsettledMarkets.length} fancy markets for match ${matchId}`);
    }
  }

  /**
   * Void a single fancy market and refund all pending bets
   */
  private async voidFancyMarket(marketId: string, reason: string) {
    const market = await prisma.fancyMarket.findUnique({
      where: { id: marketId },
      select: { id: true, isSettled: true, marketName: true },
    });

    if (!market || market.isSettled) return;

    // Mark market as settled (voided)
    await prisma.fancyMarket.update({
      where: { id: marketId },
      data: {
        isSettled: true,
        settledAt: new Date(),
        settledBy: 'AUTO_SETTLEMENT',
        isSuspended: true,
      },
    });

    // Refund all pending bets
    const bets = await prisma.bet.findMany({
      where: { fancyMarketId: marketId, status: BetStatus.PENDING },
      include: { user: { select: { id: true, balance: true } } },
    });

    let refunded = 0;
    for (const bet of bets) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: BetStatus.VOID,
              settledAt: new Date(),
              settledBy: 'AUTO_SETTLEMENT',
              settlementNote: reason,
            },
          });

          const balanceBefore = bet.user.balance;
          const balanceAfter = balanceBefore.add(bet.amount);

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
              processedBy: 'AUTO_SETTLEMENT',
              processedAt: new Date(),
              description: `Fancy bet voided: ${market.marketName} - ${reason}`,
            },
          });
        });
        refunded++;
      } catch (error: any) {
        logger.error(`[AutoSettlement] Failed to void fancy bet ${bet.id}: ${error.message}`);
      }
    }

    if (bets.length > 0) {
      logger.info(`[AutoSettlement] Voided fancy market ${market.marketName}: ${refunded}/${bets.length} bets refunded`);
    }
  }

  /**
   * Void stale unsettled fancy markets.
   * If a match has been COMPLETED for 30+ minutes and fancy markets are still unsettled,
   * void them (Shakti11 didn't return a result).
   */
  async voidStaleFancyMarkets(): Promise<{ voided: number }> {
    let voided = 0;

    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find COMPLETED matches that ended 30+ min ago with unsettled fancy markets
      const matches = await prisma.match.findMany({
        where: {
          status: MatchStatus.COMPLETED,
          endTime: { lte: thirtyMinAgo },
          fancyMarkets: {
            some: { isSettled: false },
          },
        },
        select: {
          id: true,
          name: true,
          fancyMarkets: {
            where: { isSettled: false },
            select: { id: true, marketName: true },
          },
        },
      });

      for (const match of matches) {
        for (const market of match.fancyMarkets) {
          try {
            await this.voidFancyMarket(market.id, 'Stale market - no result received within 30 min of match end');
            voided++;
          } catch (error: any) {
            logger.error(`[AutoSettlement] Failed to void stale market ${market.id}: ${error.message}`);
          }
        }
      }

      if (voided > 0) {
        logger.info(`[AutoSettlement] Voided ${voided} stale fancy markets`);
      }
    } catch (error: any) {
      logger.error(`[AutoSettlement] voidStaleFancyMarkets failed: ${error.message}`);
    }

    return { voided };
  }

  /**
   * Void stale bookmaker (MATCH_WINNER) bets.
   * If a match has been COMPLETED for 1+ hour and matchWinner is still null,
   * void all pending bets to prevent indefinite PENDING state.
   */
  async voidStaleBookmakerBets(): Promise<{ voided: number }> {
    let voided = 0;

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const matches = await prisma.match.findMany({
        where: {
          status: MatchStatus.COMPLETED,
          matchWinner: null,
          isSettled: false,
          endTime: { lte: oneHourAgo },
          bets: {
            some: {
              status: BetStatus.PENDING,
            },
          },
        },
        select: {
          id: true,
          name: true,
          endTime: true,
        },
      });

      for (const match of matches) {
        try {
          const reason = 'No result available within 1 hour of match completion - auto-voided';
          await this.handleNoResult(match.id, match.name, reason);
          voided++;
          logger.info(`[AutoSettlement] Voided stale bookmaker bets for match ${match.name}`);
        } catch (error: any) {
          logger.error(`[AutoSettlement] Failed to void stale bookmaker bets for ${match.id}: ${error.message}`);
        }
      }

      if (voided > 0) {
        logger.info(`[AutoSettlement] Voided stale bookmaker bets for ${voided} matches`);
      }
    } catch (error: any) {
      logger.error(`[AutoSettlement] voidStaleBookmakerBets failed: ${error.message}`);
    }

    return { voided };
  }

  /**
   * Manual settlement by admin - set match result and trigger settlement
   */
  async manualSettle(
    matchId: string,
    data: {
      winner: string;
      winType?: string;
      winMargin?: string;
      team1Score?: string;
      team2Score?: string;
    },
    settledBy: string
  ) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, name: true, status: true, isSettled: true },
    });

    if (!match) throw new Error('Match not found');
    if (match.isSettled) throw new Error('Match already settled');

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        matchWinner: data.winner,
        winType: data.winType || null,
        winMargin: data.winMargin || null,
        team1Score: data.team1Score || undefined,
        team2Score: data.team2Score || undefined,
        settledBy,
      },
    });

    logger.info(`[AutoSettlement] Manual settlement for ${match.name}: winner=${data.winner} by ${settledBy}`);

    // The existing betSettlement.job will now pick this up and settle bets.
    // It runs every 5 min, so bets will be settled within 5 min.

    emitMatchStatusChange(matchId, 'COMPLETED', {
      winner: data.winner,
      manual: true,
    });

    return { matchId, matchName: match.name, winner: data.winner };
  }

  /**
   * Manual void - void all bets for a match
   */
  async manualVoid(matchId: string, reason: string, voidedBy: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, name: true, isSettled: true },
    });

    if (!match) throw new Error('Match not found');
    if (match.isSettled) throw new Error('Match already settled');

    await this.handleNoResult(matchId, match.name, reason);

    logger.info(`[AutoSettlement] Manual void for ${match.name} by ${voidedBy}: ${reason}`);

    return { matchId, matchName: match.name, reason };
  }

  /**
   * Manual fancy market settlement
   */
  async manualFancySettle(
    fancyMarketId: string,
    resultValue: number,
    settledBy: string
  ) {
    // Delegate to fancyMarket.service.ts settleMarket
    const fancyMarketService = (await import('./fancyMarket.service')).default;
    return await fancyMarketService.settleMarket(fancyMarketId, resultValue, settledBy);
  }

  /**
   * Get unsettled matches summary for admin dashboard
   */
  async getUnsettledMatches() {
    const matches = await prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.COMPLETED, MatchStatus.LIVE] },
        isSettled: false,
      },
      select: {
        id: true,
        name: true,
        team1: true,
        team2: true,
        status: true,
        matchWinner: true,
        startTime: true,
        endTime: true,
        _count: {
          select: {
            bets: { where: { status: BetStatus.PENDING } },
            fancyMarkets: { where: { isSettled: false } },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return matches.map(m => ({
      id: m.id,
      name: m.name,
      team1: m.team1,
      team2: m.team2,
      status: m.status,
      matchWinner: m.matchWinner,
      startTime: m.startTime,
      endTime: m.endTime,
      pendingBets: m._count.bets,
      unsettledFancyMarkets: m._count.fancyMarkets,
    }));
  }
}

export default new AutoSettlementService();
