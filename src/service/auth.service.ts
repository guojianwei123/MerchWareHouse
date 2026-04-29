import { createHmac, timingSafeEqual } from 'node:crypto';
import { UserRepository, type UserRepositoryPort } from '../repo/user.repo';
import {
  AuthSessionSchema,
  MiniappLoginInputSchema,
  UserProfileUpdateSchema,
  type AuthProvider,
  type AuthSession,
  type User,
  type UserProfile,
} from '../types/models/user.schema';

interface CodeExchangeResult {
  openId: string;
}

export interface MiniappCodeExchangePort {
  exchangeCode: (provider: AuthProvider, code: string) => Promise<CodeExchangeResult>;
}

type AuthErrorCode = 'AUTH_INVALID_TOKEN' | 'AUTH_LOGIN_FAILED' | 'AUTH_FORBIDDEN';

export class AuthServiceError extends Error {
  constructor(
    message: string,
    readonly code: AuthErrorCode,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export class MiniappCodeExchangeAdapter implements MiniappCodeExchangePort {
  async exchangeCode(provider: AuthProvider, code: string): Promise<CodeExchangeResult> {
    if (provider === 'dev') {
      if (process.env.NODE_ENV === 'production') {
        throw new AuthServiceError('生产环境不能使用开发访客登录。', 'AUTH_FORBIDDEN', 403);
      }

      return { openId: code };
    }

    const appId = provider === 'wechat' ? process.env.WECHAT_MINIAPP_APPID : process.env.QQ_MINIAPP_APPID;
    const secret = provider === 'wechat' ? process.env.WECHAT_MINIAPP_SECRET : process.env.QQ_MINIAPP_SECRET;

    if (!appId || !secret) {
      throw new AuthServiceError('小程序登录配置缺失。', 'AUTH_LOGIN_FAILED', 500);
    }

    const url = new URL(provider === 'wechat'
      ? 'https://api.weixin.qq.com/sns/jscode2session'
      : 'https://api.q.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const response = await fetch(url);
    const payload = await response.json() as { openid?: unknown; errcode?: unknown; errmsg?: unknown };

    if (!response.ok || typeof payload.openid !== 'string' || payload.openid.length === 0) {
      const message = typeof payload.errmsg === 'string' ? payload.errmsg : `小程序登录失败：${response.status}`;
      throw new AuthServiceError(message, 'AUTH_LOGIN_FAILED', 401);
    }

    return { openId: payload.openid };
  }
}

const base64UrlEncode = (value: string): string => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

export class AuthService {
  constructor(
    private readonly userRepository: UserRepositoryPort = new UserRepository(),
    private readonly codeExchange: MiniappCodeExchangePort = new MiniappCodeExchangeAdapter(),
    private readonly tokenSecret = process.env.AUTH_TOKEN_SECRET ?? 'dev-auth-token-secret',
  ) {}

  async login(input: unknown): Promise<AuthSession> {
    const parsed = MiniappLoginInputSchema.parse(input);

    if (parsed.provider === 'dev' && process.env.NODE_ENV === 'production') {
      throw new AuthServiceError('生产环境不能使用开发访客登录。', 'AUTH_FORBIDDEN', 403);
    }

    const exchanged = await this.codeExchange.exchangeCode(parsed.provider, parsed.code);
    const user = await this.userRepository.upsertByProviderOpenId(parsed.provider, exchanged.openId, parsed.profile);

    return AuthSessionSchema.parse({
      token: this.signToken(user.id),
      user,
    });
  }

  async updateProfile(userId: string, input: unknown): Promise<User> {
    const profile = UserProfileUpdateSchema.parse(input);
    const updated = await this.userRepository.updateProfile(userId, profile);

    if (!updated) {
      throw new AuthServiceError('用户不存在。', 'AUTH_INVALID_TOKEN', 401);
    }

    return updated;
  }

  async requireUser(token: string | undefined): Promise<User> {
    if (!token) {
      throw new AuthServiceError('请先登录。', 'AUTH_INVALID_TOKEN', 401);
    }

    const userId = this.verifyToken(token);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AuthServiceError('登录已失效，请重新登录。', 'AUTH_INVALID_TOKEN', 401);
    }

    return user;
  }

  private signToken(userId: string): string {
    const payload = base64UrlEncode(JSON.stringify({ sub: userId }));
    const signature = this.createSignature(payload);
    return `${payload}.${signature}`;
  }

  private verifyToken(token: string): string {
    const [payload, signature] = token.split('.');

    if (!payload || !signature) {
      throw new AuthServiceError('登录已失效，请重新登录。', 'AUTH_INVALID_TOKEN', 401);
    }

    const expected = this.createSignature(payload);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new AuthServiceError('登录已失效，请重新登录。', 'AUTH_INVALID_TOKEN', 401);
    }

    let parsed: { sub?: unknown };

    try {
      parsed = JSON.parse(base64UrlDecode(payload)) as { sub?: unknown };
    } catch {
      throw new AuthServiceError('登录已失效，请重新登录。', 'AUTH_INVALID_TOKEN', 401);
    }

    if (typeof parsed.sub !== 'string' || parsed.sub.length === 0) {
      throw new AuthServiceError('登录已失效，请重新登录。', 'AUTH_INVALID_TOKEN', 401);
    }

    return parsed.sub;
  }

  private createSignature(payload: string): string {
    return createHmac('sha256', this.tokenSecret).update(payload).digest('base64url');
  }
}

export const createDevAuthSession = (profile: UserProfile = {}): unknown => ({
  provider: 'dev',
  code: 'dev-guest',
  profile,
});
