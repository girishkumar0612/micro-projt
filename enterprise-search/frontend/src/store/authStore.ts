import { create } from 'zustand';
import type { AuthUser } from '@/types';
import { apiService } from '@/services';

// Keys shared with the axios interceptor (services/apiClient.ts).
const TOKEN_KEY = 'atlas.auth.token';
const USER_KEY = 'atlas.auth.user';

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: readUser(),

  login: async (username, password) => {
    const res = await apiService.login({ username, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    set({ token: res.token, user: res.user });
    return res.user;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));
