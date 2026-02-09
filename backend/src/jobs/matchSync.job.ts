import cron from 'node-cron';
import matchService from '../services/match.service';
import logger from '../config/logger';

export const startMatchSyncJob = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running match sync job...');
    try {
      await matchService.syncMatches();
      await matchService.updateMatchScores();
    } catch (error: any) {
      logger.error('Match sync job failed:', error.message);
    }
  });

  logger.info('Match sync job scheduled (every 5 minutes)');
};
