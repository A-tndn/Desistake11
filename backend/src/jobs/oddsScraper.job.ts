import oddsScraperService from '../services/oddsScraper.service';
import prisma from '../db';
import { MatchStatus } from '@prisma/client';
import logger from '../config/logger';

/**
 * Odds Scraper Job - Adaptive Polling
 *
 * Dynamically adjusts polling frequency based on whether live matches exist:
 * - LIVE matches present: odds every 5s, fancy every 8s (near real-time)
 * - No live matches: odds every 15s, fancy every 30s (idle mode)
 *
 * Source: Shakti11 API (api.shakti11.com)
 */

const LIVE_ODDS_INTERVAL = 5000;    // 5s when live matches exist
const IDLE_ODDS_INTERVAL = 15000;   // 15s when no live matches
const LIVE_FANCY_INTERVAL = 8000;   // 8s when live matches exist
const IDLE_FANCY_INTERVAL = 30000;  // 30s when no live matches

let hasLiveMatches = false;

async function checkLiveMatches() {
  try {
    const count = await prisma.match.count({
      where: { status: MatchStatus.LIVE },
    });
    hasLiveMatches = count > 0;
  } catch {
    // Default to aggressive polling on error
    hasLiveMatches = true;
  }
}

function scheduleOddsSync() {
  const interval = hasLiveMatches ? LIVE_ODDS_INTERVAL : IDLE_ODDS_INTERVAL;
  setTimeout(async () => {
    try {
      await oddsScraperService.syncOdds();
    } catch (error: any) {
      logger.error('Odds scraper job failed:', error.message);
    }
    scheduleOddsSync();
  }, interval);
}

function scheduleFancySync() {
  const interval = hasLiveMatches ? LIVE_FANCY_INTERVAL : IDLE_FANCY_INTERVAL;
  setTimeout(async () => {
    try {
      await oddsScraperService.syncFancyMarkets();
    } catch (error: any) {
      logger.error('Fancy scraper job failed:', error.message);
    }
    scheduleFancySync();
  }, interval);
}

export const startOddsScraperJob = () => {
  // Check for live matches every 30 seconds
  setInterval(checkLiveMatches, 30000);
  checkLiveMatches(); // Initial check

  // Initial sync after 5s delay
  setTimeout(async () => {
    logger.info('Running initial odds scraper sync...');
    try {
      const result = await oddsScraperService.syncOdds();
      logger.info('Initial odds sync complete: ' + result.synced + ' matches synced, ' + result.newMatches + ' new');

      // Run fancy sync 3 seconds after odds sync
      setTimeout(async () => {
        logger.info('Running initial fancy market sync...');
        try {
          const fancyResult = await oddsScraperService.syncFancyMarkets();
          logger.info('Initial fancy sync complete: ' + fancyResult.synced + ' matches, ' + fancyResult.created + ' created, ' + fancyResult.updated + ' updated');
        } catch (error: any) {
          logger.error('Initial fancy sync failed:', error.message);
        }
        scheduleFancySync();
      }, 3000);
    } catch (error: any) {
      logger.error('Initial odds scraper sync failed:', error.message);
    }
    scheduleOddsSync();
  }, 5000);

  logger.info(`Odds scraper job scheduled (adaptive: odds ${LIVE_ODDS_INTERVAL / 1000}s/${IDLE_ODDS_INTERVAL / 1000}s, fancy ${LIVE_FANCY_INTERVAL / 1000}s/${IDLE_FANCY_INTERVAL / 1000}s) - Source: Shakti11`);
};
