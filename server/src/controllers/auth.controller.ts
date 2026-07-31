import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validations/auth.validation.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { userRepository } from '../repositories/user.repository.js';
import { ApiError } from '../utils/ApiError.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(
        validatedData.email,
        validatedData.password,
        validatedData.name,
        validatedData.role
      );

      res.status(201).json(new ApiResponse(201, result, 'User registered successfully'));
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData.email, validatedData.password);

      res.status(200).json(new ApiResponse(200, result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }

  async refreshTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshTokens(validatedData.refreshToken);

      res.status(200).json(new ApiResponse(200, result, 'Tokens refreshed successfully'));
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User context not found');
      }

      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        throw new ApiError(404, 'User profile not found');
      }

      const userProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      };

      res.status(200).json(new ApiResponse(200, userProfile, 'User profile retrieved'));
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
