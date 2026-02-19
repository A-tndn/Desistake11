import axios from 'axios';
import prisma from '../db';
import { MatchStatus, MatchType, FancyMarketCategory } from '@prisma/client';
import logger from '../config/logger';
import redisClient from '../db/redis';
import { broadcastAll, emitOddsUpdate, emitMatchStatusChange, emitToMatch, emitBookmakerUpdate } from '../utils/socketEmitter';
import fancyMarketService from './fancyMarket.service';

const SHAKTI_API_URL = 'https://api.shakti11.com/cm/v1/cricket/all-matches-dashboard';
const SHAKTI_ODDS_URL = 'https://api.shakti11.com/cm/v1/cricket/odds';
const CACHE_KEY = 'scraper:shakti11:matches';
const CACHE_TTL = 3; // 3 seconds for live data freshness

const SHAKTI_HEADERS = {
  'Accept': 'application/json',
  'Origin': 'https://shakti11.com',
  'Referer': 'https://shakti11.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
};

interface ShaktiMatch {
  cricketId: number;
  gameId: string;
  marketId: string;
  eventId: string;
  eventName: string;
  eventTime: string;
  inPlay: boolean;
  back1: number;
  lay1: number;
  back11: number;
  lay11: number;
  back12: number;
  lay12: number;
  selectionId1: number;
  runnerName1: string | null;
  selectionId2: number;
  runnerName2: string | null;
  m1: string | null;
  f: string | null;
  vir: number;
}

interface OddDetail {
  selectionId: number;
  marketId: string | null;
  runnerName: string;
  back1: string;
  backSize1: string;
  lay1: string;
  laySize1: string;
  status: string;
  maxLimit: number | null;
  remark: string;
}

interface MarketOdds {
  marketId: string;
  marketStatus: string;
  marketName: string;
  isPlay: string;
  gameType: string | null;
  sid: string | null;
  status: string;
  oddDetailsDTOS: OddDetail[];
}

class OddsScraperService {
  private isRunning = false;
  private isFancyRunning = false;

  /**
   * Fetch all matches from shakti11 dashboard API
   */
  async fetchShaktiMatches(): Promise<ShaktiMatch[]> {
    try {
      const response = await axios.get(SHAKTI_API_URL, {
        headers: SHAKTI_HEADERS,
        timeout: 8000,
      });

      if (response.data?.status === 'success' && Array.isArray(response.data.response)) {
        return response.data.response;
      }

      logger.warn('Unexpected shakti11 API response format');
      return [];
    } catch (error: any) {
      logger.error('Failed to fetch shakti11 matches:', error.message);
      return [];
    }
  }

  /**
   * Fetch detailed odds (match odds + bookmaker + fancy) for a specific match from Shakti11
   */
  async fetchShaktiFancy(cricketId: number): Promise<{ fancyOdds: MarketOdds[]; bookMakerOdds: any[] }> {
    const cacheKey = `scraper:shakti11:fancy:${cricketId}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    try {
      const response = await axios.get(`${SHAKTI_ODDS_URL}/${cricketId}`, {
        headers: SHAKTI_HEADERS,
        timeout: 10000,
      });

      if (response.data?.status === 'success' && response.data.response) {
        const fancyOdds = response.data.response.fancyOdds || [];
        const bookMakerOdds = response.data.response.bookMakerOdds || [];
        const result = { fancyOdds, bookMakerOdds };
        try {
          await redisClient.setEx(cacheKey, 5, JSON.stringify(result));
        } catch (e) {}
        return result;
      }

      return { fancyOdds: [], bookMakerOdds: [] };
    } catch (error: any) {
      logger.error(`Failed to fetch Shakti11 fancy for cricketId ${cricketId}:`, error.message);
      return { fancyOdds: [], bookMakerOdds: [] };
    }
  }

  /**
   * Detect fancy market category from Shakti11 gameType and market name
   */
  private detectFancyCategory(gameType: string | null, marketName: string): FancyMarketCategory {
    const gt = (gameType || '').toLowerCase();
    const lower = marketName.toLowerCase();

    // Map Shakti11 gameType to our categories
    if (gt === 'session' || gt === 'normal') {
      if (lower.includes('over runs') || lower.includes('over run') || lower.includes('ov run')) {
        return FancyMarketCategory.OVER_RUNS;
      }
      return FancyMarketCategory.SESSION;
    }
    if (gt === 'odd_even' || gt === 'oddeven') return FancyMarketCategory.CUSTOM;
    if (gt === 'meter' || gt === 'metre') return FancyMarketCategory.BOUNDARIES;
    if (gt === 'khado' || gt === 'khadda' || gt === 'wicket') return FancyMarketCategory.WICKETS;
    if (gt === 'fancy1' || gt === 'fancy2' || gt === 'w/p') {
      if (lower.includes('runs') || lower.includes('batting')) return FancyMarketCategory.PLAYER_RUNS;
      if (lower.includes('wkt') || lower.includes('wicket')) return FancyMarketCategory.WICKETS;
      return FancyMarketCategory.SESSION;
    }
    if (gt === 'ball_by_ball' || gt === 'ball' || gt === 'ballbyball') return FancyMarketCategory.OVER_RUNS;
    if (gt === 'extra' || gt === 'xtra') return FancyMarketCategory.EXTRAS;

    // Fallback: use market name keywords
    if (lower.includes('over runs') || lower.includes('over run')) return FancyMarketCategory.OVER_RUNS;
    if (lower.includes('runs') && (lower.includes('player') || lower.includes('batsman'))) return FancyMarketCategory.PLAYER_RUNS;
    if (lower.includes('wicket') || lower.includes('wkt')) return FancyMarketCategory.WICKETS;
    if (lower.includes('boundary') || lower.includes('four') || lower.includes('six')) return FancyMarketCategory.BOUNDARIES;
    if (lower.includes('extra') || lower.includes('wide') || lower.includes('noball')) return FancyMarketCategory.EXTRAS;

    return FancyMarketCategory.SESSION;
  }

  /**
   * Derive sort order from gameType for consistent ordering
   */
  private deriveSortOrder(gameType: string | null, _marketName: string): number {
    const gt = (gameType || '').toLowerCase();
    if (gt === 'session' || gt === 'normal') return 10;
    if (gt === 'fancy1' || gt === 'w/p') return 30;
    if (gt === 'odd_even' || gt === 'oddeven') return 70;
    if (gt === 'extra' || gt === 'xtra') return 55;
    if (gt === 'meter' || gt === 'metre') return 125;
    if (gt === 'khado' || gt === 'khadda' || gt === 'wicket') return 135;
    if (gt === 'ball_by_ball' || gt === 'ball') return 150;
    return 50;
  }

  /**
   * Sync fancy markets for all live/upcoming matches from Shakti11
   * Replaces old Fairdeal-based fancy syncing
   */
  async syncFancyMarkets(): Promise<{ synced: number; created: number; updated: number }> {
    if (this.isFancyRunning) {
      return { synced: 0, created: 0, updated: 0 };
    }

    this.isFancyRunning = true;
    let synced = 0;
    let created = 0;
    let updated = 0;

    try {
      // Get all our active matches (LIVE or UPCOMING) that came from shakti11
      const activeMatches = await prisma.match.findMany({
        where: {
          cricketApiId: { startsWith: 'shakti_' },
          status: { in: [MatchStatus.LIVE, MatchStatus.UPCOMING] },
        },
        select: { id: true, cricketApiId: true, status: true },
      });

      // We need the dashboard data to get cricketId for each match
      const dashboardMatches = await this.fetchShaktiMatches();
      const gameIdToCricketId = new Map<string, number>();
      for (const dm of dashboardMatches) {
        gameIdToCricketId.set(dm.gameId, dm.cricketId);
      }

      for (const match of activeMatches) {
        const gameId = match.cricketApiId!.replace('shakti_', '');
        const cricketId = gameIdToCricketId.get(gameId);

        if (!cricketId) continue;

        try {
          const { fancyOdds, bookMakerOdds } = await this.fetchShaktiFancy(cricketId);

          // Sync bookmaker odds (Indian rates) into match metadata
          if (bookMakerOdds && bookMakerOdds.length > 0) {
            try {
              const bm1 = bookMakerOdds[0]?.bm1;
              if (bm1 && bm1.oddDetailsDTOS) {
                const bmData: any = {
                  marketStatus: bm1.status || bm1.marketStatus,
                  runners: bm1.oddDetailsDTOS.map((r: any) => ({
                    name: r.runnerName,
                    back1: parseFloat(r.back1) || 0,
                    lay1: parseFloat(r.lay1) || 0,
                    backSize1: parseFloat(r.backSize1) || 0,
                    laySize1: parseFloat(r.laySize1) || 0,
                    status: r.status,
                  })),
                };
                const isBmSuspended = bm1.status === 'SUSPENDED' || bm1.marketStatus === 'SUSPENDED';
                await prisma.match.update({
                  where: { id: match.id },
                  data: {
                    metadata: { bookmakerOdds: bmData },
                    bookmakerSuspended: isBmSuspended,
                  },
                });

                // Push bookmaker odds update via Socket.io
                emitBookmakerUpdate(match.id, {
                  bookmakerOdds: bmData,
                  bookmakerSuspended: isBmSuspended,
                });
              }
            } catch (bmErr: any) {
              logger.warn(`Failed to sync bookmaker odds for match ${match.id}: ${bmErr.message}`);
            }
          }

          if (fancyOdds.length === 0) continue;

          // Get existing fancy markets for this match
          const existingMarkets = await prisma.fancyMarket.findMany({
            where: { matchId: match.id },
            select: { id: true, metadata: true, marketName: true },
          });

          // Build lookup by external market_id stored in metadata
          const existingByExtId = new Map<string, string>();
          for (const em of existingMarkets) {
            const meta = em.metadata as any;
            if (meta?.externalMarketId) {
              existingByExtId.set(meta.externalMarketId, em.id);
            }
          }

          const processedExtIds = new Set<string>();

          // Each fancyOdds entry is a MarketOdds with oddDetailsDTOS containing individual runners
          const seenMarketNames = new Set();

          for (const fo of fancyOdds) {
            for (const detail of fo.oddDetailsDTOS) {
              const extMarketId = detail.marketId || `${fo.marketId}_${detail.selectionId}`;

              const layPrice = parseFloat(detail.lay1);
              const backPrice = parseFloat(detail.back1);
              const laySize = parseFloat(detail.laySize1);
              const backSize = parseFloat(detail.backSize1);

              const noValue = layPrice > 0 ? layPrice : null;
              const yesValue = backPrice > 0 ? backPrice : null;

              // Skip markets with no actual values (empty stubs)
              if (noValue === null && yesValue === null) continue;

              // Deduplicate by normalized market name
              const rawName = (detail.runnerName || fo.marketName || 'Unknown').trim();
              const normName = rawName.toLowerCase().replace(/\s+/g, ' ');
              if (seenMarketNames.has(normName)) continue;
              seenMarketNames.add(normName);

              processedExtIds.add(extMarketId);
              const noRate = laySize > 0 ? laySize : 100;
              const yesRate = backSize > 0 ? backSize : 100;
              // For UPCOMING matches, keep markets open if they have valid values
              const externalSuspended = detail.status === 'SUSPENDED' || fo.status === 'SUSPENDED';
              const isSuspended = (match.status === 'UPCOMING' && (noValue !== null || yesValue !== null)) ? false : externalSuspended;
              const category = this.detectFancyCategory(fo.gameType, detail.runnerName || fo.marketName);
              const sortOrder = this.deriveSortOrder(fo.gameType, detail.runnerName || fo.marketName);

              const marketData = {
                marketName: (detail.runnerName || fo.marketName || 'Unknown').trim(),
                category,
                noValue,
                yesValue,
                noRate,
                yesRate,
                isSuspended,
                isActive: detail.status !== 'REMOVED',
                sortOrder,
                minBet: 100,
                maxBet: detail.maxLimit || 50000,
                metadata: {
                  externalMarketId: extMarketId,
                  selectionId: detail.selectionId,
                  parentMarketId: fo.marketId,
                  gameType: fo.gameType,
                  source: 'shakti11',
                  remark: detail.remark || null,
                },
              };

              const existingId = existingByExtId.get(extMarketId);

              if (existingId) {
                await prisma.fancyMarket.update({
                  where: { id: existingId },
                  data: marketData,
                });
                updated++;
              } else {
                await prisma.fancyMarket.create({
                  data: {
                    matchId: match.id,
                    ...marketData,
                  },
                });
                created++;
              }
            }
          }

          // Auto-settle fancy markets that have a declared result (remark with numeric value)
          for (const fo of fancyOdds) {
            for (const detail of fo.oddDetailsDTOS) {
              const remark = (detail.remark || '').trim();
              // A numeric remark means the market has been declared with a result
              if (remark && !isNaN(parseFloat(remark))) {
                const resultValue = parseFloat(remark);
                const extMarketId = detail.marketId || `${fo.marketId}_${detail.selectionId}`;
                const localId = existingByExtId.get(extMarketId);

                if (localId) {
                  // Check if already settled
                  const localMarket = await prisma.fancyMarket.findUnique({
                    where: { id: localId },
                    select: { id: true, isSettled: true, marketName: true },
                  });

                  if (localMarket && !localMarket.isSettled) {
                    try {
                      await fancyMarketService.settleMarket(localId, resultValue, 'AUTO_SCRAPER');
                      logger.info(`Auto-settled fancy market: ${localMarket.marketName} = ${resultValue}`);
                    } catch (settleErr: any) {
                      logger.error(`Auto-settle failed for ${localMarket.marketName}: ${settleErr.message}`);
                    }
                  }
                }
              }
            }
          }

          // Mark markets that disappeared from feed as suspended
          // Only for LIVE matches - UPCOMING matches keep their markets open
          if (match.status !== 'UPCOMING') {
            for (const em of existingMarkets) {
              const meta = em.metadata as any;
              if (meta?.externalMarketId && !processedExtIds.has(meta.externalMarketId)) {
                if (meta?.source === 'shakti11' || meta?.source === 'fairdeal') {
                  await prisma.fancyMarket.update({
                    where: { id: em.id },
                    data: { isSuspended: true },
                  });
                }
              }
            }
          }

          // Emit fancy update to connected clients
          if (created > 0 || updated > 0) {
            const allFancies = await prisma.fancyMarket.findMany({
              where: { matchId: match.id, isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            });
            emitToMatch(match.id, 'fancy:bulk-update', allFancies);
          }

          synced++;
        } catch (error: any) {
          logger.error(`Failed to sync fancy for match ${match.cricketApiId}:`, error.message);
        }
      }

      if (synced > 0) {
        logger.info(`Fancy scraper: synced=${synced} matches, created=${created}, updated=${updated}`);
      }

      return { synced, created, updated };
    } catch (error: any) {
      logger.error('Fancy scraper sync failed:', error.message);
      return { synced: 0, created: 0, updated: 0 };
    } finally {
      this.isFancyRunning = false;
    }
  }

  /**
   * Check if a shakti11 entry is a valid match (not a tournament header or test entry)
   */
  private isValidMatch(sm: ShaktiMatch): boolean {
    const name = sm.eventName.trim();

    // Must contain  v  — the standard team separator
    if (!name.includes(' v ')) return false;

    // Skip entries with marketId 0 AND all-zero odds (placeholder/tournament entries)
    if (sm.marketId === '0' && sm.back1 === 0 && sm.lay1 === 0 && sm.back12 === 0 && sm.lay12 === 0) {
      return false;
    }

    // Skip entries named Test A v Test B (test placeholder)
    if (name.toLowerCase().startsWith('test a v test b')) return false;

    return true;
  }

  /**
   * Parse team names from event name (e.g., India v Pakistan → [India, Pakistan])
   */
  private parseTeams(eventName: string): { team1: string; team2: string } {
    const trimmed = eventName.trim();

    const parts = trimmed.split(' v ');
    if (parts.length >= 2) {
      return {
        team1: parts[0].trim(),
        team2: parts.slice(1).join(' v ').trim(),
      };
    }
    const vsParts = trimmed.split(' vs ');
    if (vsParts.length >= 2) {
      return {
        team1: vsParts[0].trim(),
        team2: vsParts.slice(1).join(' vs ').trim(),
      };
    }
    return { team1: trimmed, team2: 'TBA' };
  }

  /**
   * Detect match type from event name
   */
  private detectMatchType(eventName: string): MatchType {
    const lower = eventName.toLowerCase();
    if (lower.includes('t20') || lower.includes('twenty20') || lower.includes('ipl') || lower.includes('bbl') || lower.includes('psl') || lower.includes('cpl')) {
      return MatchType.T20;
    }
    if (lower.includes('odi') || lower.includes('one day')) {
      return MatchType.ODI;
    }
    if (lower.includes('test')) {
      return MatchType.TEST;
    }
    if (lower.includes('t10') || lower.includes('the hundred') || lower.includes('100')) {
      return MatchType.T10;
    }
    return MatchType.T20;
  }

  /**
   * Extract tournament from event name if possible
   */
  private extractTournament(eventName: string): string {
    const lower = eventName.toLowerCase();
    if (lower.includes('ipl')) return 'IPL 2026';
    if (lower.includes('world cup')) return 'ICC World Cup 2026';
    if (lower.includes('bbl')) return 'Big Bash League';
    if (lower.includes('psl')) return 'Pakistan Super League';
    if (lower.includes('cpl')) return 'Caribbean Premier League';
    if (lower.includes('asia cup')) return 'Asia Cup';
    if (lower.includes('champions trophy')) return 'Champions Trophy 2025';
    return 'International Cricket';
  }

  /**
   * Main sync method — fetches from shakti11 and upserts into our database
   */
  async syncOdds(): Promise<{ synced: number; updated: number; newMatches: number }> {
    if (this.isRunning) {
      logger.debug('Odds scraper already running, skipping');
      return { synced: 0, updated: 0, newMatches: 0 };
    }

    this.isRunning = true;
    let synced = 0;
    let updated = 0;
    let newMatches = 0;

    try {
      const shaktiMatches = await this.fetchShaktiMatches();

      if (shaktiMatches.length === 0) {
        logger.debug('No matches from shakti11');
        return { synced: 0, updated: 0, newMatches: 0 };
      }

      // Cache the raw data in Redis for quick access
      try {
        await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(shaktiMatches));
      } catch (e) {
        // Redis might not be connected
      }

      const validMatches = shaktiMatches.filter((sm) => this.isValidMatch(sm));

      for (const sm of validMatches) {
        try {
          const { team1, team2 } = this.parseTeams(sm.eventName);
          const externalId = `shakti_${sm.gameId}`;

          const matchStatus = sm.inPlay ? MatchStatus.LIVE : MatchStatus.UPCOMING;

          let startTime: Date;
          try {
            startTime = new Date(sm.eventTime);
            if (isNaN(startTime.getTime())) {
              startTime = new Date();
            }
          } catch {
            startTime = new Date();
          }

          const team1BackOdds = sm.back1 > 0 ? sm.back1 : null;
          const team1LayOdds = sm.lay1 > 0 ? sm.lay1 : null;
          const team2BackOdds = sm.back12 > 0 ? sm.back12 : null;
          const team2LayOdds = sm.lay12 > 0 ? sm.lay12 : null;
          const drawBackOdds = sm.back11 > 0 ? sm.back11 : null;
          const drawLayOdds = sm.lay11 > 0 ? sm.lay11 : null;

          const existing = await prisma.match.findFirst({
            where: { cricketApiId: externalId },
          });

          if (existing) {
            const oddsChanged =
              existing.team1BackOdds !== team1BackOdds ||
              existing.team1LayOdds !== team1LayOdds ||
              existing.team2BackOdds !== team2BackOdds ||
              existing.team2LayOdds !== team2LayOdds ||
              existing.drawBackOdds !== drawBackOdds ||
              existing.drawLayOdds !== drawLayOdds;

            const statusChanged = existing.status !== matchStatus;

            const updateData: any = {
              lastSyncedAt: new Date(),
            };

            if (oddsChanged) {
              updateData.team1BackOdds = team1BackOdds;
              updateData.team1LayOdds = team1LayOdds;
              updateData.team2BackOdds = team2BackOdds;
              updateData.team2LayOdds = team2LayOdds;
              updateData.drawBackOdds = drawBackOdds;
              updateData.drawLayOdds = drawLayOdds;
            }

            if (statusChanged) {
              updateData.status = matchStatus;
            }

            await prisma.match.update({
              where: { id: existing.id },
              data: updateData,
            });

            if (oddsChanged) {
              emitOddsUpdate(existing.id, {
                team1BackOdds: team1BackOdds ?? undefined,
                team1LayOdds: team1LayOdds ?? undefined,
                team2BackOdds: team2BackOdds ?? undefined,
                team2LayOdds: team2LayOdds ?? undefined,
                drawBackOdds: drawBackOdds ?? undefined,
                drawLayOdds: drawLayOdds ?? undefined,
              });
            }

            if (statusChanged) {
              emitMatchStatusChange(existing.id, matchStatus);
            }

            updated++;
          } else {
            const newMatch = await prisma.match.create({
              data: {
                cricketApiId: externalId,
                name: sm.eventName.trim(),
                shortName: `${team1} vs ${team2}`,
                matchType: this.detectMatchType(sm.eventName),
                venue: 'TBA',
                team1,
                team2,
                tournament: this.extractTournament(sm.eventName),
                startTime,
                status: matchStatus,
                team1BackOdds,
                team1LayOdds,
                team2BackOdds,
                team2LayOdds,
                drawBackOdds,
                drawLayOdds,
                lastSyncedAt: new Date(),
              },
            });

            broadcastAll('match:new', {
              id: newMatch.id,
              name: newMatch.name,
              shortName: newMatch.shortName,
              team1: newMatch.team1,
              team2: newMatch.team2,
              status: newMatch.status,
              startTime: newMatch.startTime,
            });

            newMatches++;
          }

          synced++;
        } catch (error: any) {
          logger.error(`Failed to sync match ${sm.eventName}:`, error.message);
        }
      }

      await this.markStaleMatches(validMatches);

      broadcastAll('matches:updated', { count: synced });

      logger.info(`Odds scraper: synced=${synced}, updated=${updated}, new=${newMatches}`);
      return { synced, updated, newMatches };
    } catch (error: any) {
      logger.error('Odds scraper sync failed:', error.message);
      return { synced: 0, updated: 0, newMatches: 0 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Mark matches that are no longer in the shakti11 feed
   */
  private async markStaleMatches(currentMatches: ShaktiMatch[]) {
    try {
      const currentExternalIds = currentMatches.map((m) => `shakti_${m.gameId}`);

      const staleMatches = await prisma.match.findMany({
        where: {
          cricketApiId: {
            startsWith: 'shakti_',
            notIn: currentExternalIds,
          },
          status: {
            in: [MatchStatus.LIVE, MatchStatus.UPCOMING],
          },
          lastSyncedAt: {
            lt: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      });

      for (const match of staleMatches) {
        if (match.status === MatchStatus.LIVE) {
          await prisma.match.update({
            where: { id: match.id },
            data: {
              status: MatchStatus.COMPLETED,
              endTime: new Date(),
            },
          });
          emitMatchStatusChange(match.id, 'COMPLETED');
          logger.info(`Match ${match.name} marked as COMPLETED (disappeared from feed)`);
        } else if (match.status === MatchStatus.UPCOMING) {
          await prisma.match.update({
            where: { id: match.id },
            data: {
              status: MatchStatus.COMPLETED,
              bettingLocked: true,
            },
          });
          emitMatchStatusChange(match.id, 'COMPLETED');
          logger.info(`Match ${match.name} removed (no longer in Shakti feed)`);
        }
      }
    } catch (error: any) {
      logger.error('Failed to mark stale matches:', error.message);
    }
  }

  /**
   * Get cached matches from Redis (for fast API responses)
   */
  async getCachedMatches(): Promise<ShaktiMatch[] | null> {
    try {
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Redis might not be connected
    }
    return null;
  }
}

export default new OddsScraperService();
