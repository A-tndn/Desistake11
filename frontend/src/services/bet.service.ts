import { api } from '@/lib/api';

interface PlaceBetData {
  matchId: string;
  betType: string;
  betOn: string;
  amount: number;
  odds: number;
  description?: string;
}

class BetService {
  async placeBet(data: PlaceBetData) {
    return await api.post<any>('/bets', data);
  }

  async getUserBets(params?: { status?: string; limit?: number }) {
    return await api.get<any>('/bets', { params });
  }

  async getBetById(id: string) {
    return await api.get<any>(`/bets/${id}`);
  }
}

export const betService = new BetService();
