import cron from 'node-cron';
import autoSettlementService from '../services/autoSettlement.service';
import logger from '../config/logger';

/**
 * Auto Settlement Job
 *
 * Two cron tasks:
 * 1. Every 2 minutes: Check COMPLETED matches missing matchWinner, fetch from CricAPI
 * 2. Every 10 minutes: Void stale unsettled fancy markets (30+ min after match end)
 *
 * Works alongside the existing betSettlement.job.ts which settles bets
 * once matchWinner is populated.
 *
 * Flow:
 *   scoreScraper (30s) → marks match COMPLETED, tries extractWinner
 *   autoSettlement (2m) → if matchWinner still null, uses CricAPI to fetch full result
 *   betSettlement (5m) → settles bets for matches with matchWinner set
 */

export function startAutoSettlementJob() {
  // Every 2 minutes: fetch results for COMPLETED matches without matchWinner
  cron.schedule('*/2 * * * *', async () => {
    try {
      const result = await autoSettlementService.processCompletedMatches();
      if (result.processed > 0) {
        logger.info(`[AutoSettlementJob] Processed ${result.processed} matches`);
      }
      if (result.errors.length > 0) {
        logger.warn(`[AutoSettlementJob] ${result.errors.length} errors: ${result.errors.join('; ')}`);
      }
    } catch (error: any) {
      logger.error(`[AutoSettlementJob] Result fetch failed: ${error.message}`);
    }
  });

  // Every 10 minutes: void stale unsettled fancy markets
  cron.schedule('*/10 * * * *', async () => {
    try {
      const result = await autoSettlementService.voidStaleFancyMarkets();
      if (result.voided > 0) {
        logger.info(`[AutoSettlementJob] Voided ${result.voided} stale fancy markets`);
      }
    } catch (error: any) {
      logger.error(`[AutoSettlementJob] Stale fancy void failed: ${error.message}`);
    }
  });

  // Every 15 minutes: void stale bookmaker bets (1+ hour after match end with no result)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await autoSettlementService.voidStaleBookmakerBets();
      if (result.voided > 0) {
        logger.info(`[AutoSettlementJob] Voided stale bookmaker bets for ${result.voided} matches`);
      }
    } catch (error: any) {
      logger.error(`[AutoSettlementJob] Stale bookmaker void failed: ${error.message}`);
    }
  });

  logger.info('[AutoSettlementJob] Scheduled: result fetch (2m), stale fancy void (10m), stale bookmaker void (15m)');
}
