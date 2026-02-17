import { api } from '@/lib/api';

class UserService {
  async getProfile() {
    return await api.get<any>('/users/profile');
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return await api.post<any>('/users/change-password', { oldPassword, newPassword });
  }

  async getTransactions(params?: {
    type?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    return await api.get<any>('/users/transactions', { params });
  }

  async getLedger() {
    return await api.get<any>('/users/ledger');
  }

  async getCompletedGames() {
    return await api.get<any>('/users/completed-games');
  }
}

export const userService = new UserService();
