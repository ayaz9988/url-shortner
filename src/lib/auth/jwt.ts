import jwt from 'jsonwebtoken';
import { env } from '../../config';
import { User } from '../../lib/db/schema';

export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export class JWTService {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  /**
   * Generate access token
   */
  static generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, env.jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: 'url-shortner',
      audience: 'url-shortner-users',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(user: User): string {
    const payload: RefreshTokenPayload = {
      userId: user.id,
      tokenId: this.generateTokenId(),
    };

    return jwt.sign(payload, env.jwtSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'url-shortner',
      audience: 'url-shortner-users',
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.jwtSecret, {
        issuer: 'url-shortner',
        audience: 'url-shortner-users',
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, env.jwtSecret, {
        issuer: 'url-shortner',
        audience: 'url-shortner-users',
      }) as RefreshTokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Extract token from cookie
   */
  static extractTokenFromCookie(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies['access_token'] || null;
  }

  /**
   * Set auth cookies
   */
  static setAuthCookies(
    reply: any,
    accessToken: string,
    refreshToken: string
  ): void {
    const isProduction = env.nodeEnv === 'production';
    
    // Set access token cookie
    reply.setCookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });

    // Set refresh token cookie
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });
  }

  /**
   * Clear auth cookies
   */
  static clearAuthCookies(reply: any): void {
    reply.clearCookie('access_token', {
      path: '/',
    });
    reply.clearCookie('refresh_token', {
      path: '/api/v1/auth/refresh',
    });
  }

  /**
   * Generate unique token ID
   */
  private static generateTokenId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Get token expiration time in milliseconds
   */
  static getTokenExpirationTime(token: string): number {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded.exp * 1000; // Convert to milliseconds
    } catch {
      return 0;
    }
  }
}