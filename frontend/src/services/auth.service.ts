import { api } from '@/lib/api';

interface LoginCredentials {
  username: string;
  password: string;
  userType: 'player' | 'agent';
}

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    refreshToken: string;
    user: {
      id: string;
      username: string;
      displayName?: string;
      role: string;
      type: 'user' | 'agent';
      balance?: number;
    };
  };
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return await api.post('/auth/login', credentials);
  }

  async getMe(): Promise<any> {
    return await api.get('/auth/me');
  }

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore logout errors
    }
    localStorage.removeItem('authToken');
  }
}

export const authService = new AuthService();
