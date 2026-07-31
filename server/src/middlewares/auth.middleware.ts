import { Request, Response, NextFunction } from 'express';
import { TokenUtils } from '../utils/token.utils.js';
import { ApiError } from '../utils/ApiError.js';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token missing or invalid header format');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Authentication bearer token missing');
    }

    const payload = TokenUtils.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Access token has expired. Please use refresh token.'));
    } else {
      next(new ApiError(401, 'Invalid authentication token'));
    }
  }
};
