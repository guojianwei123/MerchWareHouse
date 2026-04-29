import type { AuthProvider, UserProfile } from '../../types/models/user.schema';

interface MiniappLoginApi {
  login: (options: {
    success: (result: { code?: string }) => void;
    fail: (error: unknown) => void;
  }) => void;
  getUserProfile?: (options: {
    desc: string;
    success: (result: { userInfo?: { nickName?: string; avatarUrl?: string } }) => void;
    fail: (error: unknown) => void;
  }) => void;
  getUserInfo?: (options: {
    success: (result: { userInfo?: { nickName?: string; avatarUrl?: string } }) => void;
    fail: (error: unknown) => void;
  }) => void;
}

export interface MiniappLoginResult {
  provider: AuthProvider;
  code: string;
}

const getRuntime = (): { provider: AuthProvider; api: MiniappLoginApi } | null => {
  const runtime = globalThis as typeof globalThis & { wx?: MiniappLoginApi; qq?: MiniappLoginApi };

  if (runtime.wx) {
    return { provider: 'wechat', api: runtime.wx };
  }

  if (runtime.qq) {
    return { provider: 'qq', api: runtime.qq };
  }

  return null;
};

export const login = (): Promise<MiniappLoginResult> => {
  const runtime = getRuntime();

  if (!runtime) {
    return Promise.resolve({ provider: 'dev', code: 'dev-guest' });
  }

  return new Promise((resolve, reject) => {
    runtime.api.login({
      success: (result) => {
        if (!result.code) {
          reject(new Error('miniapp login did not return a code'));
          return;
        }

        resolve({ provider: runtime.provider, code: result.code });
      },
      fail: (error) => reject(error),
    });
  });
};

export const getUserProfile = (): Promise<UserProfile> => {
  const runtime = getRuntime();

  if (!runtime) {
    return Promise.resolve({ nickname: '开发访客' });
  }

  return new Promise((resolve, reject) => {
    const success = (result: { userInfo?: { nickName?: string; avatarUrl?: string } }) => {
      resolve({
        nickname: result.userInfo?.nickName,
        avatarUrl: result.userInfo?.avatarUrl,
      });
    };

    if (runtime.api.getUserProfile) {
      runtime.api.getUserProfile({
        desc: '用于展示谷子仓库用户信息',
        success,
        fail: (error) => reject(error),
      });
      return;
    }

    if (runtime.api.getUserInfo) {
      runtime.api.getUserInfo({
        success,
        fail: (error) => reject(error),
      });
      return;
    }

    reject(new Error('user profile API is not available in this miniapp runtime'));
  });
};
