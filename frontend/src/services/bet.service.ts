import { api } from '@/lib/api';

interface PlaceBetData {
  matchId: string;
  betType: string;
  betOn: string;
  amount: number;
  odds: number;
  description?: string;
}

interface PlaceFancyBetData {
  matchId: string;
  betOn: string;
  amount: number;
  odds: number;
}

class BetService {
  async placeBet(data: PlaceBetData) {
    return await api.post<any>('/bets', data);
  }

  async placeFancyBet(fancyMarketId: string, data: PlaceFancyBetData) {
    return await api.post<any>(`/fancy-markets/${fancyMarketId}/place-bet`, data);
  }

  async getUserBets(params?: { status?: string; limit?: number; matchId?: string }) {
    return await api.get<any>('/bets', { params });
  }

  async getBetById(id: string) {
    return await api.get<any>(`/bets/${id}`);
  }
}

export const betService = new BetService();
