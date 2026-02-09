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
}

export const agentService = new AgentService();
