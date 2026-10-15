import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters long').max(50),
  // No role field: accounts sign up as USER. Letting the client pick ADMIN meant anyone could
  // register as an admin and read every user's tasks. Admins are created by the seed script.
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
