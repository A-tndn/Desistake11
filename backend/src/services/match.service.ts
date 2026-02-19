import prisma from '../db';
import { MatchStatus, MatchType } from '@prisma/client';
import logger from '../config/logger';
import shakti11Service from './shakti11.service';
import redisClient from '../db/redis';

// ============================================
// PLATFORM MARGIN CONFIGURATION
// ============================================
// These margins widen the spread between back/lay to ensure platform profit.
// Bookmaker: back reduced, lay increased (in percentage points, e.g. 43 → 42)
const BOOKMAKER_MARGIN = 1.5;    // 1.5 points off back, 1.5 points on lay
// Match Odds: fractional adjustment (e.g. 1.85 → 1.83 back, 1.87 → 1.89 lay)
const MATCH_ODDS_MARGIN = 0.02;  // 2 paise adjustment on decimal odds
// Fancy: rate adjustment percentage (reduces payout rate)
const FANCY_RATE_MARGIN = 0.05;  // 5% reduction on rates (100 → 95)

class MatchService {
  /**
   * Apply platform margin to bookmaker odds (percentage-based, e.g. 43/45)
   */
  private applyBookmakerMargin(back: number, lay: number): { back: number; lay: number } {
    if (back <= 0 && lay <= 0) return { back, lay };
    return {
      back: Math.max(0, parseFloat((back - BOOKMAKER_MARGIN).toFixed(2))),
      lay: parseFloat((lay + BOOKMAKER_MARGIN).toFixed(2)),
    };
  }

  /**
   * Apply platform margin to match odds (decimal odds, e.g. 1.85/1.87)
   */
  private applyMatchOddsMargin(back: number | null, lay: number | null): { back: number | null; lay: number | null } {
    return {
      back: back && back > 0 ? parseFloat((back - MATCH_ODDS_MARGIN).toFixed(2)) : back,
      lay: lay && lay > 0 ? parseFloat((lay + MATCH_ODDS_MARGIN).toFixed(2)) : lay,
    };
  }

  /**
   * Apply platform margin to fancy market rates (reduces payout)
   */
  private applyFancyMargin(rate: number): number {
    return Math.max(1, Math.round(rate * (1 - FANCY_RATE_MARGIN)));
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

    const dbMatches = await prisma.match.findMany({
      where,
      orderBy: { startTime: 'asc' },
      take: filters.limit || 50,
    });

    // Enrich with Shakti11 live odds
    try {
      const liveData = await shakti11Service.getDashboardMatches();
      if (liveData.length > 0) {
        return dbMatches.map(match => {
          // Match by team names (fuzzy)
          const live = liveData.find(l => {
            const eventName = (l.eventName || '').trim().toLowerCase();
            const t1 = (match.team1 || '').toLowerCase();
            const t2 = (match.team2 || '').toLowerCase();
            return (eventName.includes(t1.split(' ')[0]) && eventName.includes(t2.split(' ')[0])) ||
              eventName.includes(t1) || eventName.includes(t2);
          });

          if (live) {
            return {
              ...match,
              cricketId: live.cricketId,
              team1BackOdds: live.back1 > 0 ? live.back1 : null,
              team1LayOdds: live.lay1 > 0 ? live.lay1 : null,
              drawBackOdds: live.back11 > 0 ? live.back11 : null,
              drawLayOdds: live.lay11 > 0 ? live.lay11 : null,
              team2BackOdds: live.back12 > 0 ? live.back12 : null,
              team2LayOdds: live.lay12 > 0 ? live.lay12 : null,
              status: live.inPlay ? 'LIVE' : match.status,
            };
          }
          return match;
        });
      }
    } catch (err: any) {
      logger.error('Failed to enrich matches with Shakti11 odds:', err.message);
    }

    return dbMatches;
  }

  async getMatchById(id: string) {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        fancyMarkets: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
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

    if (!match) return null;

    // Enrich with cached score data from Shakti11 score API
    let liveScore: any = null;
    try {
      const cachedScore = await redisClient.get(`score:${id}`);
      if (cachedScore) {
        liveScore = JSON.parse(cachedScore);
      }
    } catch (e) {}

    // If we have live score and the match's DB scores are stale, use live data
    if (liveScore) {
      if (liveScore.team1Score) (match as any).team1Score = liveScore.team1Score;
      if (liveScore.team2Score) (match as any).team2Score = liveScore.team2Score;
      // Attach extra score fields for the frontend
      (match as any).statusText = liveScore.statusText || null;
      (match as any).recentBalls = liveScore.recentBalls || [];
      (match as any).runRate = liveScore.runRate || null;
      (match as any).requiredRunRate = liveScore.requiredRunRate || null;
      (match as any).battingTeam = liveScore.battingTeam || null;
    }

    // Enrich with Shakti11 live odds + fancy markets
    try {
      const liveData = await shakti11Service.getDashboardMatches();
      const live = liveData.find(l => {
        const eventName = (l.eventName || '').trim().toLowerCase();
        const t1 = (match.team1 || '').toLowerCase();
        const t2 = (match.team2 || '').toLowerCase();
        return (eventName.includes(t1.split(' ')[0]) && eventName.includes(t2.split(' ')[0]));
      });

      if (live) {
        const enriched: any = {
          ...match,
          cricketId: live.cricketId,
          team1BackOdds: live.back1 > 0 ? live.back1 : null,
          team1LayOdds: live.lay1 > 0 ? live.lay1 : null,
          drawBackOdds: live.back11 > 0 ? live.back11 : null,
          drawLayOdds: live.lay11 > 0 ? live.lay11 : null,
          team2BackOdds: live.back12 > 0 ? live.back12 : null,
          team2LayOdds: live.lay12 > 0 ? live.lay12 : null,
        };

        // Fetch detailed odds with fancy
        const detailedOdds = await shakti11Service.getMatchOdds(live.cricketId);
        if (detailedOdds) {
          // Map Shakti11 fancy odds to FancyMarket shape that FancySection expects
          // Raw rates from Shakti11 (no margin)
          const shakti11FancyMarkets = detailedOdds.fancyOdds.flatMap(fo =>
            fo.oddDetailsDTOS.map(d => ({
              id: d.marketId || `${fo.marketId}_${d.selectionId}`,
              marketName: d.runnerName || 'Unknown',
              category: fo.gameType || 'Normal',
              noValue: parseFloat(d.lay1) > 0 ? parseFloat(d.lay1) : null,
              yesValue: parseFloat(d.back1) > 0 ? parseFloat(d.back1) : null,
              noRate: parseFloat(d.laySize1) || 100,
              yesRate: parseFloat(d.backSize1) || 100,
              isSuspended: match.status === 'UPCOMING' && (parseFloat(d.back1) > 0 || parseFloat(d.lay1) > 0)
                ? false
                : (d.status === 'SUSPENDED' || fo.status === 'SUSPENDED'),
              isActive: match.status === 'UPCOMING' ? true : d.status !== 'SUSPENDED',
              minBet: 100,
              maxBet: d.maxLimit || 50000,
            }))
          );

          // Merge: DB fancy markets take precedence, deduplicate by normalized market name
          const dbFancyNames = new Set(
            (match.fancyMarkets || []).map((fm: any) =>
              (fm.marketName || '').trim().toLowerCase().replace(/\s+/g, ' ')
            )
          );
          const newFancyMarkets = shakti11FancyMarkets.filter(fm => {
            const normName = (fm.marketName || '').trim().toLowerCase().replace(/\s+/g, ' ');
            return !dbFancyNames.has(normName);
          });

          // For DB markets that are UPCOMING, use DB isSuspended (already fixed by scraper)
          const allFancyMarkets = [
            ...(match.fancyMarkets || []),
            ...newFancyMarkets,
          ];

          // Filter out noise: match Shakti11 behavior - only show markets with current live odds
          // Build a set of market names currently in the Shakti11 live feed
          const liveMarketNames = new Set(
            shakti11FancyMarkets.map((fm: any) =>
              (fm.marketName || '').trim().toLowerCase().replace(/\s+/g, ' ')
            )
          );

          enriched.fancyMarkets = allFancyMarkets.filter((fm: any) => {
            const normName = (fm.marketName || '').trim().toLowerCase().replace(/\s+/g, ' ');
            const noVal = fm.noValue != null ? parseFloat(fm.noValue) : 0;
            const yesVal = fm.yesValue != null ? parseFloat(fm.yesValue) : 0;
            const hasOdds = noVal > 0 || yesVal > 0;

            // Always show markets currently in the Shakti11 live feed
            if (liveMarketNames.has(normName)) return true;

            // For DB-only markets (not in live feed):
            // Show only if not suspended AND has active odds
            if (!fm.isSuspended && hasOdds) return true;

            // Hide everything else (suspended, stale, or no odds)
            return false;
          });

          // Also enrich match odds from detailed data (with margin)
          if (detailedOdds.matchOdds?.length > 0) {
            const mo = detailedOdds.matchOdds[0];
            if (mo.oddDetailsDTOS?.length >= 2) {
              const runner1 = mo.oddDetailsDTOS[0];
              const runner2 = mo.oddDetailsDTOS[1];
              enriched.team1BackOdds = parseFloat(runner1.back1) > 0 ? parseFloat(runner1.back1) : enriched.team1BackOdds;
              enriched.team1LayOdds = parseFloat(runner1.lay1) > 0 ? parseFloat(runner1.lay1) : enriched.team1LayOdds;
              enriched.team2BackOdds = parseFloat(runner2.back1) > 0 ? parseFloat(runner2.back1) : enriched.team2BackOdds;
              enriched.team2LayOdds = parseFloat(runner2.lay1) > 0 ? parseFloat(runner2.lay1) : enriched.team2LayOdds;
            }
            // Check for draw (3rd runner)
            if (mo.oddDetailsDTOS?.length >= 3) {
              const draw = mo.oddDetailsDTOS[2];
              enriched.drawBackOdds = parseFloat(draw.back1) > 0 ? parseFloat(draw.back1) : enriched.drawBackOdds;
              enriched.drawLayOdds = parseFloat(draw.lay1) > 0 ? parseFloat(draw.lay1) : enriched.drawLayOdds;
            }
          }

          // Enrich bookmaker odds (raw from Shakti11, no margin)
          if (detailedOdds.bookMakerOdds?.length > 0) {
            const bm = detailedOdds.bookMakerOdds[0];
            const bmData = bm.bm1 || bm;
            if (bmData.oddDetailsDTOS?.length >= 2) {
              enriched.bookmakerTeam1Back = parseFloat(bmData.oddDetailsDTOS[0].back1) || 0;
              enriched.bookmakerTeam1Lay = parseFloat(bmData.oddDetailsDTOS[0].lay1) || 0;
              enriched.bookmakerTeam2Back = parseFloat(bmData.oddDetailsDTOS[1].back1) || 0;
              enriched.bookmakerTeam2Lay = parseFloat(bmData.oddDetailsDTOS[1].lay1) || 0;
              // Only treat as suspended if ALL runners are suspended or no valid odds
              const allRunnersSuspended = bmData.oddDetailsDTOS.every(
                (r: any) => r.status === 'SUSPENDED'
              );
              const hasValidOdds = bmData.oddDetailsDTOS.some(
                (r: any) => parseFloat(r.back1) > 0 || parseFloat(r.lay1) > 0
              );
              enriched.bookmakerSuspended = allRunnersSuspended || !hasValidOdds;
            }
          }
        }

        return enriched;
      }
    } catch (err: any) {
      logger.error('Failed to enrich match detail with Shakti11:', err.message);
    }

    // Filter out suspended DB fancy markets with no odds (same as enriched path)
    const filtered: any = { ...match };
    filtered.fancyMarkets = (match.fancyMarkets || []).filter((fm: any) => {
      const noVal = fm.noValue != null ? parseFloat(fm.noValue) : 0;
      const yesVal = fm.yesValue != null ? parseFloat(fm.yesValue) : 0;
      if (!fm.isSuspended) return true;
      if (noVal > 0 || yesVal > 0) return true;
      return false;
    });
    return filtered;
  }

  async syncMatches() {
    // Sync matches from Shakti11 dashboard into local DB
    try {
      const liveData = await shakti11Service.getDashboardMatches();
      let synced = 0;

      for (const match of liveData) {
        if (!match.eventName?.trim()) continue;
        const teams = match.eventName.trim().split(' v ');
        if (teams.length < 2) continue;

        const team1 = teams[0].trim();
        const team2 = teams[1].trim();

        const existing = await prisma.match.findFirst({
          where: {
            OR: [
              { cricketApiId: match.eventId },
              { AND: [{ team1 }, { team2 }] },
            ],
          },
        });

        const matchData: any = {
          cricketApiId: match.eventId,
          name: match.eventName.trim(),
          shortName: `${team1} vs ${team2}`,
          team1,
          team2,
          startTime: new Date(match.eventTime),
          status: match.inPlay ? MatchStatus.LIVE : MatchStatus.UPCOMING,
          lastSyncedAt: new Date(),
        };

        if (existing) {
          await prisma.match.update({
            where: { id: existing.id },
            data: matchData,
          });
        } else {
          await prisma.match.create({
            data: {
              ...matchData,
              matchType: MatchType.T20,
              venue: 'TBA',
              tournament: 'ICC Mens T20 World Cup',
            },
          });
        }
        synced++;
      }

      logger.info(`Synced ${synced} matches from Shakti11`);
      return { synced };
    } catch (error: any) {
      logger.error('Match sync failed:', error.message);
      throw error;
    }
  }

  async updateMatchScores() {
    // For now, odds are fetched live; score updates will come from the scraper
    logger.info('Score update triggered - odds are fetched live from Shakti11');
    return { updated: 0 };
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

  private extractTournament(matchName: string): string {
    const parts = matchName.split(', ');
    if (parts.length >= 3) {
      for (let i = parts.length - 1; i >= 1; i--) {
        const part = parts[i];
        if (
          part.includes('Trophy') ||
          part.includes('Cup') ||
          part.includes('League') ||
          part.includes('Series') ||
          part.includes('Championship') ||
          part.includes('Tournament') ||
          part.includes('Premier') ||
          part.includes('IPL') ||
          part.includes('ICC') ||
          part.includes('Asia') ||
          /20\d{2}/.test(part)
        ) {
          return parts.slice(i).join(', ');
        }
      }
      return parts[parts.length - 1];
    }
    return parts.length > 1 ? parts[parts.length - 1] : matchName;
  }

  private extractWinner(result: string): string | null {
    const match = result.match(/^(\w+)\s+won/i);
    return match ? match[1] : null;
  }
}

export default new MatchService();
