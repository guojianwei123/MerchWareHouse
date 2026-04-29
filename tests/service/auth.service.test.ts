import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthService, type MiniappCodeExchangePort } from '../../src/service/auth.service';
import { UserRepository } from '../../src/repo/user.repo';
import type { AuthProvider } from '../../src/types/models/user.schema';

class StaticCodeExchange implements MiniappCodeExchangePort {
  async exchangeCode(provider: AuthProvider, code: string): Promise<{ openId: string }> {
    return { openId: `${provider}-${code}` };
  }
}

describe('AuthService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('creates a user session and resolves the token back to the user', async () => {
    const service = new AuthService(new UserRepository(), new StaticCodeExchange(), 'test-secret');

    const session = await service.login({
      provider: 'wechat',
      code: 'login-code',
      profile: { nickname: '测试用户', avatarUrl: 'https://example.com/avatar.jpg' },
    });
    const user = await service.requireUser(session.token);

    expect(session.user).toMatchObject({
      provider: 'wechat',
      openId: 'wechat-login-code',
      nickname: '测试用户',
    });
    expect(user.id).toBe(session.user.id);
  });

  it('updates user profile after login', async () => {
    const service = new AuthService(new UserRepository(), new StaticCodeExchange(), 'test-secret');
    const session = await service.login({ provider: 'qq', code: 'login-code' });

    const updated = await service.updateProfile(session.user.id, {
      nickname: 'QQ 用户',
      avatarUrl: 'https://example.com/qq.jpg',
    });

    expect(updated.nickname).toBe('QQ 用户');
    expect(updated.avatarUrl).toBe('https://example.com/qq.jpg');
  });

  it('rejects invalid tokens', async () => {
    const service = new AuthService(new UserRepository(), new StaticCodeExchange(), 'test-secret');

    await expect(service.requireUser('invalid-token')).rejects.toMatchObject({
      code: 'AUTH_INVALID_TOKEN',
      statusCode: 401,
    });
  });

  it('rejects malformed signed token payloads as invalid tokens', async () => {
    const service = new AuthService(new UserRepository(), new StaticCodeExchange(), 'test-secret');
    const payload = Buffer.from('not-json').toString('base64url');
    const signature = createHmac('sha256', 'test-secret').update(payload).digest('base64url');

    await expect(service.requireUser(`${payload}.${signature}`)).rejects.toMatchObject({
      code: 'AUTH_INVALID_TOKEN',
      statusCode: 401,
    });
  });

  it('rejects dev provider in production before code exchange', async () => {
    process.env.NODE_ENV = 'production';
    const service = new AuthService(new UserRepository(), new StaticCodeExchange(), 'test-secret');

    await expect(service.login({ provider: 'dev', code: 'dev-guest' })).rejects.toMatchObject({
      code: 'AUTH_FORBIDDEN',
      statusCode: 403,
    });
  });
});
