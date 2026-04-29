import { PrismaClient } from '@prisma/client';
import { UserSchema, type AuthProvider, type User, type UserProfile } from '../types/models/user.schema';

export interface UserRepositoryPort {
  findById: (id: string) => Promise<User | null>;
  findByProviderOpenId: (provider: AuthProvider, openId: string) => Promise<User | null>;
  upsertByProviderOpenId: (provider: AuthProvider, openId: string, profile?: UserProfile) => Promise<User>;
  updateProfile: (id: string, profile: UserProfile) => Promise<User | null>;
}

const createUserId = (provider: AuthProvider, openId: string): string => {
  const compactOpenId = openId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || Date.now().toString(36);
  return `user_${provider}_${compactOpenId}`;
};

export class UserRepository implements UserRepositoryPort {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByProviderOpenId(provider: AuthProvider, openId: string): Promise<User | null> {
    return Array.from(this.users.values()).find((user) => user.provider === provider && user.openId === openId) ?? null;
  }

  async upsertByProviderOpenId(provider: AuthProvider, openId: string, profile: UserProfile = {}): Promise<User> {
    const existing = await this.findByProviderOpenId(provider, openId);

    if (existing) {
      return (await this.updateProfile(existing.id, profile)) ?? existing;
    }

    const user = UserSchema.parse({
      id: createUserId(provider, openId),
      provider,
      openId,
      ...profile,
    });
    this.users.set(user.id, user);
    return user;
  }

  async updateProfile(id: string, profile: UserProfile): Promise<User | null> {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    const updated = UserSchema.parse({
      ...existing,
      ...profile,
    });
    this.users.set(updated.id, updated);
    return updated;
  }
}

const fromPersistedUser = (user: {
  id: string;
  provider: string;
  openId: string;
  nickname: string | null;
  avatarUrl: string | null;
}): User => UserSchema.parse({
  id: user.id,
  provider: user.provider,
  openId: user.openId,
  nickname: user.nickname ?? undefined,
  avatarUrl: user.avatarUrl ?? undefined,
});

export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma = new PrismaClient()) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? fromPersistedUser(user) : null;
  }

  async findByProviderOpenId(provider: AuthProvider, openId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { provider_openId: { provider, openId } },
    });
    return user ? fromPersistedUser(user) : null;
  }

  async upsertByProviderOpenId(provider: AuthProvider, openId: string, profile: UserProfile = {}): Promise<User> {
    const saved = await this.prisma.user.upsert({
      where: { provider_openId: { provider, openId } },
      create: {
        id: createUserId(provider, openId),
        provider,
        openId,
        nickname: profile.nickname ?? null,
        avatarUrl: profile.avatarUrl ?? null,
      },
      update: {
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      },
    });

    return fromPersistedUser(saved);
  }

  async updateProfile(id: string, profile: UserProfile): Promise<User | null> {
    try {
      const saved = await this.prisma.user.update({
        where: { id },
        data: {
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
        },
      });
      return fromPersistedUser(saved);
    } catch {
      return null;
    }
  }
}
