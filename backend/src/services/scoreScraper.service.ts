import prisma from '../db';
import { MatchStatus } from '@prisma/client';
import logger from '../config/logger';
import redisClient from '../db/redis';
import shakti11Service from './shakti11.service';
import { emitScoreUpdate } from '../utils/socketEmitter';

interface ScoreData {
  team1Score: string | null;
  team2Score: string | null;
  statusText: string | null;
  currentBatsmen: any[];
  currentBowler: any | null;
  recentBalls: string[];
  runRate: string | null;
  requiredRunRate: string | null;
  battingTeam: string | null;
}

class ScoreScraperService {
  private isRunning = false;

  /**
   * Sync live scores from Shakti11's score API for all LIVE matches
   * Uses the score-sport2 endpoint with eventId (= gameId from dashboard)
   */
  async syncScores(): Promise<{ updated: number }> {
    if (this.isRunning) return { updated: 0 };
    this.isRunning = true;

    let updated = 0;

    try {
      // Get our LIVE matches that came from Shakti11
      const liveMatches = await prisma.match.findMany({
        where: {
          status: MatchStatus.LIVE,
          cricketApiId: { startsWith: 'shakti_' },
        },
        select: { id: true, team1: true, team2: true, name: true, cricketApiId: true },
      });

      if (liveMatches.length === 0) return { updated: 0 };

      // Get dashboard data to map gameId -> eventId
      // eventId in the score API = gameId from dashboard
      const dashboardMatches = await shakti11Service.getDashboardMatches();
      const gameIdToEventId = new Map<string, string>();
      for (const dm of dashboardMatches) {
        // gameId is the eventId for the score API
        gameIdToEventId.set(dm.gameId, dm.gameId);
      }

      for (const match of liveMatches) {
        const gameId = match.cricketApiId!.replace('shakti_', '');
        const eventId = gameIdToEventId.get(gameId);

        if (!eventId) continue;

        try {
          const scoreData = await shakti11Service.fetchScore(eventId);
          if (!scoreData) continue;

          // Map Shakti11 score fields to our format
          const team1Score = scoreData.score1 || null;
          const team2Score = scoreData.score2 || null;
          const statusText = scoreData.spnmessage || null;
          const recentBalls = Array.isArray(scoreData.balls) ? scoreData.balls.filter(b => b !== '') : [];

          // Determine which team is batting based on activenation flags
          const team1Batting = scoreData.activenation1 === '1';
          const team2Batting = scoreData.activenation2 === '1';
          const battingTeam = team1Batting ? 'team1' : team2Batting ? 'team2' : null;

          // Get current run rate (batting team's run rate)
          let runRate: string | null = null;
          let requiredRunRate: string | null = null;

          if (team1Batting) {
            runRate = scoreData.spnrunrate1 || null;
            requiredRunRate = scoreData.spnreqrate1 || null;
          } else if (team2Batting) {
            runRate = scoreData.spnrunrate2 || null;
            requiredRunRate = scoreData.spnreqrate2 || null;
          }

          // Use the nation abbreviations if available
          const team1Short = scoreData.spnnation1 || match.team1;
          const team2Short = scoreData.spnnation2 || match.team2;

          // Only update if we have any new score data
          if (team1Score || team2Score || statusText) {
            await prisma.match.update({
              where: { id: match.id },
              data: {
                team1Score: team1Score || undefined,
                team2Score: team2Score || undefined,
              },
            });

            // Cache detailed score data for the frontend
            const cachedScore: ScoreData = {
              team1Score,
              team2Score,
              statusText,
              currentBatsmen: [],
              currentBowler: null,
              recentBalls,
              runRate,
              requiredRunRate,
              battingTeam,
            };

            try {
              await redisClient.setEx(
                `score:${match.id}`,
                30,
                JSON.stringify(cachedScore)
              );
            } catch (e) {}

            // Emit real-time score update via socket (includes all detailed fields)
            emitScoreUpdate(match.id, {
              matchId: match.id,
              team1Score,
              team2Score,
              statusText,
              recentBalls,
              runRate,
              requiredRunRate,
              battingTeam,
              team1Short,
              team2Short,
            });

            updated++;
          }

          // Check if match ended
          if (scoreData.isfinished === '1') {
            await prisma.match.update({
              where: { id: match.id },
              data: {
                status: MatchStatus.COMPLETED,
                endTime: new Date(),
                matchWinner: this.extractWinner(statusText || '', match.team1, match.team2),
              },
            });
            logger.info(`Match ${match.name} marked COMPLETED from Shakti11 score: ${statusText}`);
          }
        } catch (matchErr: any) {
          logger.debug(`Score fetch failed for match ${match.name}: ${matchErr.message}`);
        }
      }

      if (updated > 0) {
        logger.info(`Score scraper: updated ${updated} matches via Shakti11`);
      }

      return { updated };
    } catch (error: any) {
      logger.error('Score scraper failed:', error.message);
      return { updated: 0 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Extract winner name from status text
   */
  private extractWinner(status: string, team1: string, team2: string): string | null {
    if (!status) return null;
    const lower = status.toLowerCase();
    if (lower.includes(team1.toLowerCase()) && lower.includes('won')) return team1;
    if (lower.includes(team2.toLowerCase()) && lower.includes('won')) return team2;
    // Try first word match
    const t1First = team1.split(' ')[0].toLowerCase();
    const t2First = team2.split(' ')[0].toLowerCase();
    if (lower.includes(t1First) && lower.includes('won')) return team1;
    if (lower.includes(t2First) && lower.includes('won')) return team2;
    return null;
  }

  /**
   * Get cached score data for a match
   */
  async getScore(matchId: string): Promise<ScoreData | null> {
    try {
      const cached = await redisClient.get(`score:${matchId}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  }
}

export default new ScoreScraperService();
