import { api } from '@/lib/api';

class AgentService {
  async createPlayer(data: {
    username: string;
    password: string;
    displayName: string;
    email?: string;
    phone?: string;
    creditLimit: number;
  }) {
    return await api.post<any>('/agents/create-player', data);
  }

  async getPlayers() {
    return await api.get<any>('/agents/players');
  }

  async getStats() {
    return await api.get<any>('/agents/stats');
  }

  async getHierarchy() {
    return await api.get<any>('/agents/hierarchy');
  }

  async transferCredit(playerId: string, amount: number) {
    return await api.post<any>('/agents/transfer-credit', { playerId, amount });
  }

  async deductCredit(playerId: string, amount: number) {
    return await api.post<any>('/agents/deduct-credit', { playerId, amount });
  }

  // Master Agent Only
  async getMasterAllPlayers() {
    return await api.get<any>('/agents/master/players');
  }

  async getPlayerBettingSettings(playerId: string) {
    return await api.get<any>(`/agents/master/players/${playerId}/settings`);
  }

  async updatePlayerBettingSettings(playerId: string, settings: {
    bookmakerDelay?: number;
    sessionDelay?: number;
    matchDelay?: number;
    bookmakerMinStack?: number;
    bookmakerMaxStack?: number;
    betDeleteAllowed?: boolean;
  }) {
    return await api.put<any>(`/agents/master/players/${playerId}/settings`, settings);
  }
}

export const agentService = new AgentService();
