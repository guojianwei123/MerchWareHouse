import type { NextFunction, Request, Response } from 'express';
import { AuthService, AuthServiceError } from '../../service/auth.service';
import type { User } from '../../types/models/user.schema';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const getBearerToken = (req: Request): string | undefined => {
  const authorization = req.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice('Bearer '.length).trim();
};

export const createRequireAuth = (authService: AuthService) => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      req.user = await authService.requireUser(getBearerToken(req));
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireAuthenticatedUser = (req: AuthenticatedRequest): User => {
  if (!req.user) {
    throw new AuthServiceError('请先登录。', 'AUTH_INVALID_TOKEN', 401);
  }

  return req.user;
};
