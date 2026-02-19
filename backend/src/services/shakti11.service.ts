import axios from 'axios';
import logger from '../config/logger';
import redisClient from '../db/redis';

const SHAKTI11_CM_BASE = 'https://api.shakti11.com/cm/v1';

interface Shakti11Match {
  cricketId: number;
  gameId: string;
  marketId: string;
  eventId: string;
  eventName: string;
  selectionId1: number;
  runnerName1: string | null;
  selectionId2: number;
  runnerName2: string | null;
  selectionId3: number;
  runnerName3: string | null;
  eventTime: string;
  inPlay: boolean;
  tv: string | null;
  back1: number;
  lay1: number;
  back11: number;
  lay11: number;
  back12: number;
  lay12: number;
  m1: string | null;
  f: string | null;
  vir: number;
  matchType: string | null;
}

interface OddDetail {
  selectionId: number;
  marketId: string | null;
  runnerName: string;
  back1: string;
  backSize1: string;
  back2: string;
  backSize2: string;
  back3: string;
  backSize3: string;
  lay1: string;
  laySize1: string;
  lay2: string;
  laySize2: string;
  lay3: string;
  laySize3: string;
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

interface MatchOddsResponse {
  matchOdds: MarketOdds[];
  bookMakerOdds: any[];
  fancyOdds: MarketOdds[];
}

const headers = {
  'Accept': 'application/json',
  'Origin': 'https://shakti11.com',
  'Referer': 'https://shakti11.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:134.0) Gecko/20100101 Firefox/134.0',
};

const SHAKTI11_SCORE_URL = 'https://api.shakti11.com/aam/v1/auth/score-sport2';

interface Shakti11ScoreData {
  score1: string;
  score2: string;
  spnnation1: string;
  spnnation2: string;
  spnrunrate1: string;
  spnrunrate2: string;
  spnreqrate1: string;
  spnreqrate2: string;
  spnmessage: string;
  balls: string[];
  activenation1: string;
  activenation2: string;
  isfinished: string;
  spnballrunningstatus: string;
  dayno: string;
}

class Shakti11Service {
  async getDashboardMatches(): Promise<Shakti11Match[]> {
    const cacheKey = 'shakti11:dashboard';

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    try {
      const { data } = await axios.get(
        `${SHAKTI11_CM_BASE}/cricket/all-matches-dashboard`,
        { headers, timeout: 10000 }
      );

      if (data.status === 'success' && data.code === 200) {
        const matches = data.response as Shakti11Match[];
        try {
          await redisClient.setEx(cacheKey, 5, JSON.stringify(matches));
        } catch (e) {}
        return matches;
      }

      return [];
    } catch (error: any) {
      logger.error('Shakti11 dashboard fetch failed:', error.message);
      return [];
    }
  }

  async getMatchOdds(cricketId: number): Promise<MatchOddsResponse | null> {
    const cacheKey = `shakti11:odds:${cricketId}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    try {
      const { data } = await axios.get(
        `${SHAKTI11_CM_BASE}/cricket/odds/${cricketId}`,
        { headers, timeout: 10000 }
      );

      if (data.status === 'success' && data.code === 200) {
        const odds = data.response as MatchOddsResponse;
        try {
          await redisClient.setEx(cacheKey, 3, JSON.stringify(odds));
        } catch (e) {}
        return odds;
      }

      return null;
    } catch (error: any) {
      logger.error(`Shakti11 odds fetch failed for ${cricketId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch live score from Shakti11's score API
   * eventId = gameId from dashboard (e.g., "35278212")
   */
  async fetchScore(eventId: string): Promise<Shakti11ScoreData | null> {
    const cacheKey = `shakti11:score:${eventId}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    try {
      const { data } = await axios.post(
        `${SHAKTI11_SCORE_URL}?eventId=${eventId}`,
        null,
        { headers, timeout: 8000 }
      );

      if (data.status === 'success' && data.code === 200 && data.response?.data?.score) {
        const score = data.response.data.score as Shakti11ScoreData;
        try {
          await redisClient.setEx(cacheKey, 5, JSON.stringify(score));
        } catch (e) {}
        return score;
      }

      return null;
    } catch (error: any) {
      logger.debug(`Shakti11 score fetch failed for eventId ${eventId}: ${error.message}`);
      return null;
    }
  }

  // Combines dashboard data with odds for each match
  async getMatchesWithOdds(): Promise<any[]> {
    const matches = await this.getDashboardMatches();

    // Filter out invalid/empty matches
    const validMatches = matches.filter(m =>
      m.eventName && m.eventName.trim() && m.cricketId
    );

    // Parse team names from eventName
    return validMatches.map(m => {
      const teams = m.eventName.trim().split(' v ');
      const team1 = teams[0]?.trim() || 'TBA';
      const team2 = teams[1]?.trim() || 'TBA';

      return {
        cricketId: m.cricketId,
        gameId: m.gameId,
        marketId: m.marketId,
        eventId: m.eventId,
        eventName: m.eventName.trim(),
        team1,
        team2,
        eventTime: m.eventTime,
        inPlay: m.inPlay,
        matchOdds: {
          team1Back: m.back1,
          team1Lay: m.lay1,
          drawBack: m.back11,
          drawLay: m.lay11,
          team2Back: m.back12,
          team2Lay: m.lay12,
        },
      };
    });
  }

  // Get detailed odds including fancy for a specific match
  async getDetailedOdds(cricketId: number): Promise<any> {
    const odds = await this.getMatchOdds(cricketId);
    if (!odds) return null;

    return {
      matchOdds: odds.matchOdds.map(mo => ({
        marketId: mo.marketId,
        marketName: mo.marketName,
        status: mo.status,
        isPlay: mo.isPlay === 'true',
        runners: mo.oddDetailsDTOS.map(d => ({
          selectionId: d.selectionId,
          runnerName: d.runnerName,
          back: [
            { price: parseFloat(d.back1), size: parseFloat(d.backSize1) },
            { price: parseFloat(d.back2), size: parseFloat(d.backSize2) },
            { price: parseFloat(d.back3), size: parseFloat(d.backSize3) },
          ],
          lay: [
            { price: parseFloat(d.lay1), size: parseFloat(d.laySize1) },
            { price: parseFloat(d.lay2), size: parseFloat(d.laySize2) },
            { price: parseFloat(d.lay3), size: parseFloat(d.laySize3) },
          ],
          status: d.status,
        })),
      })),
      bookMakerOdds: odds.bookMakerOdds.map(bmo => {
        const bm = bmo.bm1 || bmo;
        return {
          marketId: bm.marketId,
          marketName: bm.marketName,
          status: bm.status,
          runners: bm.oddDetailsDTOS?.map((d: OddDetail) => ({
            selectionId: d.selectionId,
            runnerName: d.runnerName,
            back: { price: parseFloat(d.back1), size: parseFloat(d.backSize1) },
            lay: { price: parseFloat(d.lay1), size: parseFloat(d.laySize1) },
            status: d.status,
          })) || [],
        };
      }),
      fancyOdds: odds.fancyOdds.flatMap(fo =>
        fo.oddDetailsDTOS.map(d => ({
          marketId: d.marketId || fo.marketId,
          marketName: fo.marketName,
          gameType: fo.gameType,
          selectionId: d.selectionId,
          runnerName: d.runnerName,
          back: parseFloat(d.back1),
          backSize: parseFloat(d.backSize1),
          lay: parseFloat(d.lay1),
          laySize: parseFloat(d.laySize1),
          status: d.status,
          maxLimit: d.maxLimit,
        }))
      ),
    };
  }
}

export default new Shakti11Service();
