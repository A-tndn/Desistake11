import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  displayName?: string;
  role: string;
  type: 'user' | 'agent';
  balance?: number;
  exposure?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateBalance: (balance: number) => void;
  updateExposure: (exposure: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (token, user) => {
        localStorage.setItem('authToken', token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('authToken');
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateBalance: (balance) =>
        set((state) => ({
          user: state.user ? { ...state.user, balance } : null,
        })),

      updateExposure: (exposure) =>
        set((state) => ({
          user: state.user ? { ...state.user, exposure } : null,
        })),
    }),
    {
      name: 'auth-storage',
    }
  )
);
