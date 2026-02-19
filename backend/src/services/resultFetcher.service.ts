import axios from 'axios';
import logger from '../config/logger';

// Try to use existing cricketApi service (which has Redis caching)
let cricketApiService: any = null;
try {
  cricketApiService = require('./cricketApi.service').default;
} catch (e) {
  // Service not available, will use direct API calls
}

export interface MatchResult {
  winner: string | null;
  winType: string | null;
  winMargin: string | null;
  team1Score: string | null;
  team2Score: string | null;
  tossWinner: string | null;
  tossDecision: string | null;
  matchEnded: boolean;
  noResult: boolean;
  isDraw: boolean;
  isTie: boolean;
  resultText: string;
  source: string;
}

// Team name aliases for fuzzy matching
const TEAM_ALIASES: Record<string, string[]> = {
  'India': ['IND', 'INDIA', 'India', 'Ind'],
  'Australia': ['AUS', 'AUSTRALIA', 'Australia', 'Aus'],
  'England': ['ENG', 'ENGLAND', 'England', 'Eng'],
  'Pakistan': ['PAK', 'PAKISTAN', 'Pakistan', 'Pak'],
  'South Africa': ['SA', 'RSA', 'SOUTH AFRICA', 'South Africa', 'S Africa'],
  'New Zealand': ['NZ', 'NEW ZEALAND', 'New Zealand', 'N Zealand'],
  'Sri Lanka': ['SL', 'SRI LANKA', 'Sri Lanka', 'S Lanka'],
  'Bangladesh': ['BAN', 'BD', 'BANGLADESH', 'Bangladesh'],
  'West Indies': ['WI', 'WEST INDIES', 'West Indies', 'W Indies', 'Windies'],
  'Afghanistan': ['AFG', 'AFGHANISTAN', 'Afghanistan'],
  'Zimbabwe': ['ZIM', 'ZIMBABWE', 'Zimbabwe'],
  'Ireland': ['IRE', 'IRELAND', 'Ireland'],
  'Netherlands': ['NED', 'NETHERLANDS', 'Netherlands', 'Holland'],
  'Scotland': ['SCO', 'SCOTLAND', 'Scotland'],
  'Nepal': ['NEP', 'NEPAL', 'Nepal'],
  'Canada': ['CAN', 'CANADA', 'Canada'],
  'USA': ['USA', 'United States'],
  'Italy': ['ITA', 'ITALY', 'Italy'],
  'Australia W': ['AUS W', 'Australia W', 'Australia Women'],
  'India W': ['IND W', 'India W', 'India Women'],
};

class ResultFetcherService {
  /**
   * Fetch match result from CricAPI
   */
  async fetchFromCricApi(team1: string, team2: string): Promise<MatchResult | null> {
    try {
      let matches: any[] | null = null;

      // Use cached cricketApiService if available (avoids duplicate API calls)
      if (cricketApiService) {
        try {
          matches = await cricketApiService.getCurrentMatches();
        } catch (e: any) {
          logger.debug(`[ResultFetcher] cricketApiService failed: ${e.message}`);
        }
      }

      // Fallback to direct API call
      if (!matches) {
        const apiKey = process.env.CRICKET_API_KEY;
        if (!apiKey) {
          logger.warn('[ResultFetcher] No CRICKET_API_KEY configured');
          return null;
        }

        const response = await axios.get('https://api.cricapi.com/v1/currentMatches', {
          params: { apikey: apiKey, offset: 0 },
          timeout: 10000,
        });

        if (!response.data?.data) {
          logger.warn('[ResultFetcher] CricAPI returned no data');
          return null;
        }

        matches = response.data.data;
      }

      if (!matches || !Array.isArray(matches)) {
        logger.warn('[ResultFetcher] CricAPI returned no data');
        return null;
      }

      // Find matching match by team names
      for (const m of matches) {
        const apiTeams = (m.teams || []).map((t: string) => t.trim());
        const t1Match = apiTeams.some((t: string) => this.matchTeamName(t, team1));
        const t2Match = apiTeams.some((t: string) => this.matchTeamName(t, team2));

        if (t1Match && t2Match) {
          const statusText = (m.status || '').trim();
          const matchEnded = m.matchEnded === true;

          if (!matchEnded) {
            return null; // Match not yet completed
          }

          const parsed = this.parseResultText(statusText, team1, team2);

          // Extract scores
          const scores = m.score || [];
          let team1Score: string | null = null;
          let team2Score: string | null = null;

          for (const s of scores) {
            const inningsTeam = (s.inning || '').trim();
            if (this.matchTeamName(inningsTeam, team1)) {
              team1Score = team1Score
                ? `${team1Score} & ${s.r}/${s.w} (${s.o})`
                : `${s.r}/${s.w} (${s.o})`;
            } else if (this.matchTeamName(inningsTeam, team2)) {
              team2Score = team2Score
                ? `${team2Score} & ${s.r}/${s.w} (${s.o})`
                : `${s.r}/${s.w} (${s.o})`;
            }
          }

          // Toss info
          const tossWinner = m.tossWinner ? this.normalizeTeamName(m.tossWinner, team1, team2) : null;
          const tossDecision = m.tossChoice || null;

          return {
            ...parsed,
            team1Score,
            team2Score,
            tossWinner,
            tossDecision,
            matchEnded,
            resultText: statusText,
            source: 'cricapi',
          };
        }
      }

      logger.debug(`[ResultFetcher] No CricAPI match found for ${team1} vs ${team2}`);
      return null;
    } catch (error: any) {
      logger.error(`[ResultFetcher] CricAPI error: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch result from Cricbuzz unofficial API (fallback)
   */
  async fetchFromCricbuzz(team1: string, team2: string): Promise<MatchResult | null> {
    try {
      const response = await axios.get('https://www.cricbuzz.com/api/matches/getRecent', {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      });

      if (!response.data?.matchDetails) return null;

      for (const group of response.data.matchDetails) {
        if (!group.matchDetailsMap?.match) continue;
        for (const m of group.matchDetailsMap.match) {
          const info = m.matchInfo;
          if (!info) continue;

          const apiT1 = info.team1?.teamSName || info.team1?.teamName || '';
          const apiT2 = info.team2?.teamSName || info.team2?.teamName || '';

          if (this.matchTeamName(apiT1, team1) && this.matchTeamName(apiT2, team2)) {
            const status = info.status || '';
            const state = info.state || '';

            if (state !== 'Complete') return null;

            const parsed = this.parseResultText(status, team1, team2);
            return {
              ...parsed,
              team1Score: null,
              team2Score: null,
              tossWinner: null,
              tossDecision: null,
              matchEnded: true,
              resultText: status,
              source: 'cricbuzz',
            };
          }
        }
      }

      return null;
    } catch (error: any) {
      logger.debug(`[ResultFetcher] Cricbuzz fallback failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch result from Shakti11 dashboard data (3rd fallback)
   * Checks if the match is no longer inPlay and has result info in the m1 field
   */
  async fetchFromShakti11(team1: string, team2: string): Promise<MatchResult | null> {
    try {
      let shakti11Service: any;
      try {
        shakti11Service = require('./shakti11.service').default;
      } catch (e) {
        return null;
      }

      const matches = await shakti11Service.getDashboardMatches();
      if (!matches || !Array.isArray(matches)) return null;

      for (const m of matches) {
        const eventName = (m.eventName || '').trim();
        const parts = eventName.split(' v ');
        if (parts.length < 2) continue;

        const sTeam1 = parts[0].trim();
        const sTeam2 = parts.slice(1).join(' v ').trim();

        if (!this.matchTeamName(sTeam1, team1) && !this.matchTeamName(sTeam2, team1)) continue;
        if (!this.matchTeamName(sTeam1, team2) && !this.matchTeamName(sTeam2, team2)) continue;

        // If match is still inPlay, no result yet
        if (m.inPlay) return null;

        // Check the m1 field for match result text
        const m1Text = (m.m1 || '').trim();
        if (m1Text) {
          const parsed = this.parseResultText(m1Text, team1, team2);
          if (parsed.winner || parsed.noResult || parsed.isDraw || parsed.isTie) {
            return {
              ...parsed,
              team1Score: null,
              team2Score: null,
              tossWinner: null,
              tossDecision: null,
              matchEnded: true,
              resultText: m1Text,
              source: 'shakti11',
            };
          }
        }

        // If match is off the live feed (inPlay=false) with zero odds, likely completed
        if (!m.inPlay && m.back1 === 0 && m.lay1 === 0 && m.back12 === 0 && m.lay12 === 0) {
          logger.debug(`[ResultFetcher] Shakti11 match ${eventName} appears completed (zero odds) but no result text`);
        }
      }

      return null;
    } catch (error: any) {
      logger.debug(`[ResultFetcher] Shakti11 fallback failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch result with fallback chain
   */
  async fetchResult(team1: string, team2: string): Promise<MatchResult | null> {
    // Try CricAPI first
    let result = await this.fetchFromCricApi(team1, team2);
    if (result) {
      logger.info(`[ResultFetcher] Got result from CricAPI: ${result.resultText}`);
      return result;
    }

    // Fallback to Cricbuzz
    result = await this.fetchFromCricbuzz(team1, team2);
    if (result) {
      logger.info(`[ResultFetcher] Got result from Cricbuzz: ${result.resultText}`);
      return result;
    }

    // Fallback to Shakti11 dashboard data
    result = await this.fetchFromShakti11(team1, team2);
    if (result) {
      logger.info(`[ResultFetcher] Got result from Shakti11: ${result.resultText}`);
      return result;
    }

    return null;
  }

  /**
   * Parse result text like "India won by 7 wickets" into structured data
   */
  parseResultText(
    statusText: string,
    team1: string,
    team2: string
  ): Omit<MatchResult, 'team1Score' | 'team2Score' | 'tossWinner' | 'tossDecision' | 'matchEnded' | 'resultText' | 'source'> {
    const text = statusText.trim();

    // No result
    if (/no result/i.test(text) || /match abandoned/i.test(text) || /abandoned/i.test(text)) {
      return { winner: null, winType: null, winMargin: null, noResult: true, isDraw: false, isTie: false };
    }

    // Draw
    if (/match drawn/i.test(text) || /game drawn/i.test(text)) {
      return { winner: null, winType: 'draw', winMargin: null, noResult: false, isDraw: true, isTie: false };
    }

    // Tie
    if (/match tied/i.test(text) && !/super over/i.test(text)) {
      return { winner: null, winType: 'tie', winMargin: null, noResult: false, isDraw: false, isTie: true };
    }

    // Won by runs: "India won by 45 runs"
    const runMatch = text.match(/(.+?)\s+won\s+by\s+(\d+)\s+runs?/i);
    if (runMatch) {
      const winner = this.normalizeTeamName(runMatch[1].trim(), team1, team2);
      return { winner, winType: 'runs', winMargin: runMatch[2], noResult: false, isDraw: false, isTie: false };
    }

    // Won by wickets: "India won by 7 wickets"
    const wicketMatch = text.match(/(.+?)\s+won\s+by\s+(\d+)\s+wickets?/i);
    if (wicketMatch) {
      const winner = this.normalizeTeamName(wicketMatch[1].trim(), team1, team2);
      return { winner, winType: 'wickets', winMargin: wicketMatch[2], noResult: false, isDraw: false, isTie: false };
    }

    // Won by innings: "India won by an innings and 45 runs"
    const inningsMatch = text.match(/(.+?)\s+won\s+by\s+an?\s+innings/i);
    if (inningsMatch) {
      const winner = this.normalizeTeamName(inningsMatch[1].trim(), team1, team2);
      return { winner, winType: 'innings', winMargin: null, noResult: false, isDraw: false, isTie: false };
    }

    // Won via super over: "India won the super over"
    const superOverMatch = text.match(/(.+?)\s+won\s+(?:the\s+)?super\s+over/i);
    if (superOverMatch) {
      const winner = this.normalizeTeamName(superOverMatch[1].trim(), team1, team2);
      return { winner, winType: 'super_over', winMargin: null, noResult: false, isDraw: false, isTie: false };
    }

    // Won by DLS: "India won by 12 runs (D/L method)" or "(DLS method)"
    const dlsMatch = text.match(/(.+?)\s+won\s+by\s+(\d+)\s+runs?\s*\((?:D\/L|DLS)\s+method\)/i);
    if (dlsMatch) {
      const winner = this.normalizeTeamName(dlsMatch[1].trim(), team1, team2);
      return { winner, winType: 'DLS', winMargin: dlsMatch[2], noResult: false, isDraw: false, isTie: false };
    }

    // Generic "X won" pattern
    const genericWon = text.match(/(.+?)\s+won/i);
    if (genericWon) {
      const winner = this.normalizeTeamName(genericWon[1].trim(), team1, team2);
      if (winner) {
        return { winner, winType: null, winMargin: null, noResult: false, isDraw: false, isTie: false };
      }
    }

    logger.warn(`[ResultFetcher] Could not parse result text: "${text}"`);
    return { winner: null, winType: null, winMargin: null, noResult: false, isDraw: false, isTie: false };
  }

  /**
   * Fuzzy match a team name from API against DB team name
   */
  matchTeamName(apiName: string, dbName: string): boolean {
    if (!apiName || !dbName) return false;

    const a = apiName.toLowerCase().trim();
    const b = dbName.toLowerCase().trim();

    // Direct match
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;

    // Check aliases
    for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
      const allNames = [canonical, ...aliases].map(n => n.toLowerCase());
      const aMatch = allNames.some(n => a.includes(n) || n.includes(a));
      const bMatch = allNames.some(n => b.includes(n) || n.includes(b));
      if (aMatch && bMatch) return true;
    }

    return false;
  }

  /**
   * Normalize an API team name to match one of the DB team names
   */
  normalizeTeamName(apiName: string, team1: string, team2: string): string | null {
    if (this.matchTeamName(apiName, team1)) return team1;
    if (this.matchTeamName(apiName, team2)) return team2;
    return apiName; // Return as-is if no match found
  }
}

export default new ResultFetcherService();
