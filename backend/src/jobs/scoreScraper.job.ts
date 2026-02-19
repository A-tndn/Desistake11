import scoreScraperService from '../services/scoreScraper.service';
import prisma from '../db';
import { MatchStatus } from '@prisma/client';
import logger from '../config/logger';

/**
 * Score Scraper Job - Adaptive Polling via Shakti11
 *
 * Polls Shakti11's score-sport2 API for live match scores.
 * - LIVE matches present: every 10s
 * - No live matches: every 60s (just checking)
 *
 * Data includes: score1, score2, ball-by-ball, CRR, required run rate, status message
 */

const LIVE_INTERVAL = 10000;   // 10s when live matches exist
const IDLE_INTERVAL = 60000;   // 60s when idle

let hasLiveMatches = false;

async function checkLiveMatches() {
  try {
    const count = await prisma.match.count({
      where: { status: MatchStatus.LIVE },
    });
    hasLiveMatches = count > 0;
  } catch {
    hasLiveMatches = true;
  }
}

function scheduleScoreSync() {
  const interval = hasLiveMatches ? LIVE_INTERVAL : IDLE_INTERVAL;
  setTimeout(async () => {
    try {
      await scoreScraperService.syncScores();
    } catch (error: any) {
      logger.error('Score scraper job failed:', error.message);
    }
    scheduleScoreSync();
  }, interval);
}

export function startScoreScraperJob() {
  // Check for live matches every 30 seconds
  setInterval(checkLiveMatches, 30000);
  checkLiveMatches();

  // Initial sync after 8s delay
  setTimeout(async () => {
    logger.info('Running initial score sync via Shakti11...');
    try {
      const result = await scoreScraperService.syncScores();
      logger.info(`Initial score sync: ${result.updated} matches updated`);
    } catch (error: any) {
      logger.error('Initial score sync failed:', error.message);
    }
    scheduleScoreSync();
  }, 8000);

  logger.info(`Score scraper job scheduled (adaptive: ${LIVE_INTERVAL / 1000}s live, ${IDLE_INTERVAL / 1000}s idle) - Source: Shakti11`);
}
