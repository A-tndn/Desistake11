import prisma from '../db';
import { MatchStatus, MatchType } from '@prisma/client';
import cricketApiService from './cricketApi.service';
import logger from '../config/logger';

class MatchService {
  async syncMatches() {
    try {
      const currentMatches = await cricketApiService.getCurrentMatches();

      for (const apiMatch of currentMatches) {
        const existingMatch = await prisma.match.findFirst({
          where: { cricketApiId: apiMatch.id },
        });

        const matchData = {
          cricketApiId: apiMatch.id,
          name: apiMatch.name,
          shortName: `${apiMatch.teams[0]} vs ${apiMatch.teams[1]}`,
          matchType: this.mapMatchType(apiMatch.matchType),
          venue: apiMatch.venue || 'TBA',
          team1: apiMatch.teams[0],
          team2: apiMatch.teams[1],
          tournament: apiMatch.series_id || 'Unknown',
          startTime: new Date(apiMatch.dateTimeGMT),
          status: this.mapMatchStatus(apiMatch),
          lastSyncedAt: new Date(),
        };

        if (existingMatch) {
          await prisma.match.update({
            where: { id: existingMatch.id },
            data: matchData,
          });
        } else {
          await prisma.match.create({
            data: matchData,
          });
        }
      }

      logger.info(`Synced ${currentMatches.length} matches`);
      return { synced: currentMatches.length };
    } catch (error: any) {
      logger.error('Match sync failed:', error.message);
      throw error;
    }
  }

  async updateMatchScores() {
    try {
      const matches = await prisma.match.findMany({
        where: {
          status: {
            in: [MatchStatus.LIVE, MatchStatus.UPCOMING],
          },
        },
      });

      let updated = 0;

      for (const match of matches) {
        if (!match.cricketApiId) continue;

        try {
          const scoreData = await cricketApiService.getMatchScore(match.cricketApiId);

          const updateData: any = {
            lastSyncedAt: new Date(),
          };

          if (scoreData.score) {
            updateData.team1Score = scoreData.score[0]?.inning || null;
            updateData.team2Score = scoreData.score[1]?.inning || null;
          }

          if (scoreData.status === 'completed') {
            updateData.status = MatchStatus.COMPLETED;
            updateData.endTime = new Date();

            if (scoreData.result) {
              updateData.matchWinner = this.extractWinner(scoreData.result);
            }
          } else if (scoreData.status === 'started') {
            updateData.status = MatchStatus.LIVE;
          }

          await prisma.match.update({
            where: { id: match.id },
            data: updateData,
          });

          updated++;
        } catch (error: any) {
          logger.error(`Failed to update match ${match.id}:`, error.message);
        }
      }

      logger.info(`Updated scores for ${updated} matches`);
      return { updated };
    } catch (error: any) {
      logger.error('Score update failed:', error.message);
      throw error;
    }
  }

  async getMatches(filters: {
    status?: MatchStatus;
    matchType?: MatchType;
    tournament?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.matchType) where.matchType = filters.matchType;
    if (filters.tournament) where.tournament = { contains: filters.tournament };

    return await prisma.match.findMany({
      where,
      orderBy: { startTime: 'asc' },
      take: filters.limit || 50,
    });
  }

  async getMatchById(id: string) {
    return await prisma.match.findUnique({
      where: { id },
      include: {
        bets: {
          select: {
            id: true,
            betType: true,
            amount: true,
            status: true,
          },
        },
      },
    });
  }

  private mapMatchType(type: string): MatchType {
    const typeMap: Record<string, MatchType> = {
      test: MatchType.TEST,
      odi: MatchType.ODI,
      t20: MatchType.T20,
      t10: MatchType.T10,
      hundred: MatchType.HUNDRED,
    };

    return typeMap[type.toLowerCase()] || MatchType.T20;
  }

  private mapMatchStatus(match: any): MatchStatus {
    if (match.matchEnded) return MatchStatus.COMPLETED;
    if (match.matchStarted) return MatchStatus.LIVE;
    return MatchStatus.UPCOMING;
  }

  private extractWinner(result: string): string | null {
    const match = result.match(/^(\w+)\s+won/i);
    return match ? match[1] : null;
  }
}

export default new MatchService();
