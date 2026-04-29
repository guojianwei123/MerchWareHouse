import { create } from 'zustand';
import { getUserProfile, login as miniappLogin } from '../adapters/miniapp/auth';
import { api, setApiAuthToken } from '../service/api.service';
import type { AuthProvider, User, UserProfile } from '../types/models/user.schema';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  token: string;
  user: User | null;
  error: string | null;
  login: () => Promise<User | null>;
  refreshProfile: () => Promise<User | null>;
  logout: () => void;
}

const fallbackProfileByProvider = (provider: AuthProvider): UserProfile => {
  if (provider === 'dev') {
    return { nickname: '开发访客' };
  }

  return {};
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  token: '',
  user: null,
  error: null,
  login: async () => {
    set({ status: 'loading', error: null });

    try {
      const loginResult = await miniappLogin();
      const session = await api.loginWithMiniapp({
        ...loginResult,
        profile: fallbackProfileByProvider(loginResult.provider),
      });

      setApiAuthToken(session.token);
      set({ status: 'authenticated', token: session.token, user: session.user, error: null });
      return session.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败';
      set({ status: 'error', error: message });
      return null;
    }
  },
  refreshProfile: async () => {
    if (!get().token) {
      return null;
    }

    set({ status: 'loading', error: null });

    try {
      const profile = await getUserProfile();
      const user = await api.updateMe(profile);
      set({ status: 'authenticated', user, error: null });
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : '头像昵称授权失败';
      set({ status: 'authenticated', error: message });
      return get().user;
    }
  },
  logout: () => {
    setApiAuthToken('');
    set({ status: 'idle', token: '', user: null, error: null });
  },
}));
