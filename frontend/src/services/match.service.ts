import { api } from '@/lib/api';

class MatchService {
  async getMatches(params?: { status?: string; matchType?: string; limit?: number }) {
    return await api.get<any>('/matches', { params });
  }

  async getMatchById(id: string) {
    return await api.get<any>(`/matches/${id}`);
  }

  // Get dashboard banners
  async getBanners() {
    return await api.get<any>('/matches/banners');
  }
}

export const matchService = new MatchService();
