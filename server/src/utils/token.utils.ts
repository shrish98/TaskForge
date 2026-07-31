import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export class TokenUtils {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, ACCESS_SECRET, {
      expiresIn: '15m',
    });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, REFRESH_SECRET, {
      expiresIn: '7d',
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  }
}
