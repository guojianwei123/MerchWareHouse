import { z } from 'zod';

export const AuthProviderSchema = z.enum(['wechat', 'qq', 'dev']);

export const UserProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional(),
});

export const UserSchema = z.object({
  id: z.string().min(1),
  provider: AuthProviderSchema,
  openId: z.string().min(1),
  nickname: z.string().trim().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional(),
});

export const MiniappLoginInputSchema = z.object({
  provider: AuthProviderSchema,
  code: z.string().trim().min(1),
  profile: UserProfileSchema.optional(),
});

export const UserProfileUpdateSchema = UserProfileSchema.refine(
  (profile) => profile.nickname !== undefined || profile.avatarUrl !== undefined,
  'profile update must include nickname or avatarUrl',
);

export const AuthSessionSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
});

export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type User = z.infer<typeof UserSchema>;
export type MiniappLoginInput = z.infer<typeof MiniappLoginInputSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
