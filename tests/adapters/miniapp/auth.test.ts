import { afterEach, describe, expect, it, vi } from 'vitest';
import { getUserProfile, login } from '../../../src/adapters/miniapp/auth';

describe('miniapp auth adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses wx.login in WeChat runtime', async () => {
    vi.stubGlobal('wx', {
      login: ({ success }: { success: (result: { code: string }) => void }) => success({ code: 'wx-code' }),
    });

    await expect(login()).resolves.toEqual({ provider: 'wechat', code: 'wx-code' });
  });

  it('uses qq.login in QQ runtime', async () => {
    vi.stubGlobal('qq', {
      login: ({ success }: { success: (result: { code: string }) => void }) => success({ code: 'qq-code' }),
    });

    await expect(login()).resolves.toEqual({ provider: 'qq', code: 'qq-code' });
  });

  it('falls back to dev guest outside miniapp runtimes', async () => {
    await expect(login()).resolves.toEqual({ provider: 'dev', code: 'dev-guest' });
  });

  it('reads user profile when runtime grants authorization', async () => {
    vi.stubGlobal('wx', {
      login: vi.fn(),
      getUserProfile: ({ success }: { success: (result: { userInfo: { nickName: string; avatarUrl: string } }) => void }) =>
        success({ userInfo: { nickName: '用户', avatarUrl: 'https://example.com/avatar.jpg' } }),
    });

    await expect(getUserProfile()).resolves.toEqual({
      nickname: '用户',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });

  it('rejects profile authorization failures without affecting login capability', async () => {
    vi.stubGlobal('wx', {
      login: ({ success }: { success: (result: { code: string }) => void }) => success({ code: 'wx-code' }),
      getUserProfile: ({ fail }: { fail: (error: Error) => void }) => fail(new Error('denied')),
    });

    await expect(login()).resolves.toEqual({ provider: 'wechat', code: 'wx-code' });
    await expect(getUserProfile()).rejects.toThrow('denied');
  });
});
