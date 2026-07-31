import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository.js';
import { TokenUtils, TokenPayload } from '../utils/token.utils.js';
import { ApiError } from '../utils/ApiError.js';
import { redis } from '../config/redis.js';

export class AuthService {
  async register(email: string, password: string, name: string, role?: 'USER' | 'ADMIN') {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      email,
      passwordHash,
      name,
      role,
    });

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = TokenUtils.generateAccessToken(tokenPayload);
    const refreshToken = TokenUtils.generateRefreshToken(tokenPayload);

    // Save refresh token in DB with 7-day expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await userRepository.storeRefreshToken(user.id, refreshToken, expiresAt);

    // Cache refresh token in Redis for ultra-fast session lookup
    await redis.setex(`refresh_token:${refreshToken}`, 7 * 24 * 60 * 60, user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password credentials');
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = TokenUtils.generateAccessToken(tokenPayload);
    const refreshToken = TokenUtils.generateRefreshToken(tokenPayload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await userRepository.storeRefreshToken(user.id, refreshToken, expiresAt);
    await redis.setex(`refresh_token:${refreshToken}`, 7 * 24 * 60 * 60, user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = TokenUtils.verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new ApiError(401, 'Expired or invalid refresh token');
    }

    // Check Redis / DB whitelist
    const storedToken = await userRepository.findRefreshToken(refreshToken);
    if (!storedToken) {
      throw new ApiError(401, 'Revoked or unknown refresh token');
    }

    // Remove old refresh token (Token Rotation)
    await userRepository.deleteRefreshToken(refreshToken);
    await redis.del(`refresh_token:${refreshToken}`);

    const newTokenPayload: TokenPayload = {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    };

    const newAccessToken = TokenUtils.generateAccessToken(newTokenPayload);
    const newRefreshToken = TokenUtils.generateRefreshToken(newTokenPayload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await userRepository.storeRefreshToken(storedToken.user.id, newRefreshToken, expiresAt);
    await redis.setex(`refresh_token:${newRefreshToken}`, 7 * 24 * 60 * 60, storedToken.user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await userRepository.deleteRefreshToken(refreshToken);
      await redis.del(`refresh_token:${refreshToken}`);
    }
    return true;
  }
}

export const authService = new AuthService();
