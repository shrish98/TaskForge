import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

export const requireRole = (...allowedRoles: Array<'USER' | 'ADMIN'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'User context missing. Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access Denied: Required role [${allowedRoles.join(', ')}], but your role is [${req.user.role}]`
        )
      );
    }

    next();
  };
};
