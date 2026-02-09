import axios from 'axios';
import { config } from '../config';
import logger from '../config/logger';
import redisClient from '../db/redis';

interface CricketMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo: any[];
  score: any[];
  series_id: string;
  fantasyEnabled: boolean;
  bbbEnabled: boolean;
  hasSquad: boolean;
  matchStarted: boolean;
  matchEnded: boolean;
}

interface MatchScore {
  matchId: string;
  score: any;
  status: string;
  result: string;
}

class CricketApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.cricketApiUrl;
    this.apiKey = config.cricketApiKey;
  }

  private async makeRequest(endpoint: string, params: any = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        params: {
          apikey: this.apiKey,
          ...params,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Cricket API request failed:', error.message);
      throw new Error('Failed to fetch data from Cricket API');
    }
  }

  async getCurrentMatches(): Promise<CricketMatch[]> {
    const cacheKey = 'cricket:current_matches';

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Redis might not be connected
    }

    const data = await this.makeRequest('currentMatches');

    try {
      await redisClient.setEx(cacheKey, 120, JSON.stringify(data.data));
    } catch (e) {
      // Redis might not be connected
    }

    return data.data;
  }

  async getMatchInfo(matchId: string): Promise<any> {
    const cacheKey = `cricket:match:${matchId}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}

    const data = await this.makeRequest('match_info', { id: matchId });

    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data.data));
    } catch (e) {}

    return data.data;
  }

  async getMatchScore(matchId: string): Promise<MatchScore> {
    const cacheKey = `cricket:score:${matchId}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}

    const data = await this.makeRequest('match_scorecard', { id: matchId });

    try {
      await redisClient.setEx(cacheKey, 30, JSON.stringify(data.data));
    } catch (e) {}

    return data.data;
  }

  async getUpcomingMatches(): Promise<CricketMatch[]> {
    const data = await this.makeRequest('matches');
    return data.data.filter((match: any) => !match.matchStarted);
  }

  async getLiveMatches(): Promise<CricketMatch[]> {
    const data = await this.makeRequest('matches');
    return data.data.filter((match: any) => match.matchStarted && !match.matchEnded);
  }
}

export default new CricketApiService();
