import { TokenUtils, TokenPayload } from '../utils/token.utils';

describe('TokenUtils Utility Suite', () => {
  const mockPayload: TokenPayload = {
    userId: 'user-uuid-12345',
    email: 'test@taskforge.ai',
    role: 'USER',
  };

  it('should successfully generate and verify an Access Token', () => {
    const token = TokenUtils.generateAccessToken(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = TokenUtils.verifyAccessToken(token);
    expect(decoded.userId).toBe(mockPayload.userId);
    expect(decoded.email).toBe(mockPayload.email);
    expect(decoded.role).toBe(mockPayload.role);
  });

  it('should successfully generate and verify a Refresh Token', () => {
    const refreshToken = TokenUtils.generateRefreshToken(mockPayload);
    expect(typeof refreshToken).toBe('string');

    const decoded = TokenUtils.verifyRefreshToken(refreshToken);
    expect(decoded.userId).toBe(mockPayload.userId);
  });

  it('should fail verification for invalid tokens', () => {
    expect(() => TokenUtils.verifyAccessToken('invalid.jwt.token')).toThrow();
  });
});
