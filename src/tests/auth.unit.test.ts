import { describe, it, expect } from 'vitest';
import { JWTService } from '../lib/auth/jwt';
import { loginSchema, registerSchema, changePasswordSchema } from '../services/validation/auth';

describe('JWT Service', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JWTService.generateAccessToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should include correct payload in access token', () => {
      const token = JWTService.generateAccessToken(mockUser);
      const payload = JWTService.verifyAccessToken(token);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTService.generateRefreshToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should include correct payload in refresh token', () => {
      const token = JWTService.generateRefreshToken(mockUser);
      const payload = JWTService.verifyRefreshToken(token);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.tokenId).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = JWTService.generateAccessToken(mockUser);
      const payload = JWTService.verifyAccessToken(token);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
    });

    it('should throw error for invalid access token', () => {
      expect(() => {
        JWTService.verifyAccessToken('invalid_token');
      }).toThrow('Invalid or expired access token');
    });

    it('should throw error for expired access token', () => {
      // Create a token with very short expiration
      const expiredToken = JWTService.generateAccessToken(mockUser);
      // Simulate expired token by modifying the payload
      const parts = expiredToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.exp = Math.floor(Date.now() / 1000) - 1; // Expired 1 second ago
      const expiredParts = [
        parts[0],
        Buffer.from(JSON.stringify(payload)).toString('base64'),
        parts[2]
      ];
      const expiredTokenStr = expiredParts.join('.');
      
      expect(() => {
        JWTService.verifyAccessToken(expiredTokenStr);
      }).toThrow('Invalid or expired access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = JWTService.generateRefreshToken(mockUser);
      const payload = JWTService.verifyRefreshToken(token);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.tokenId).toBeDefined();
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTService.verifyRefreshToken('invalid_token');
      }).toThrow('Invalid or expired refresh token');
    });
  });

  describe('extractTokenFromCookie', () => {
    it('should extract access token from cookie header', () => {
      const cookieHeader = 'access_token=abc123; refresh_token=def456; other=value';
      const token = JWTService.extractTokenFromCookie(cookieHeader);
      
      expect(token).toBe('abc123');
    });

    it('should return null if no access token in cookies', () => {
      const cookieHeader = 'refresh_token=def456; other=value';
      const token = JWTService.extractTokenFromCookie(cookieHeader);
      
      expect(token).toBeNull();
    });

    it('should return null for empty cookie header', () => {
      const token = JWTService.extractTokenFromCookie('');
      
      expect(token).toBeNull();
    });

    it('should return null for undefined cookie header', () => {
      const token = JWTService.extractTokenFromCookie(undefined);
      
      expect(token).toBeNull();
    });
  });

  describe('getTokenExpirationTime', () => {
    it('should return correct expiration time', () => {
      const token = JWTService.generateAccessToken(mockUser);
      const expTime = JWTService.getTokenExpirationTime(token);
      
      expect(typeof expTime).toBe('number');
      expect(expTime).toBeGreaterThan(Date.now());
    });

    it('should return 0 for invalid token', () => {
      const expTime = JWTService.getTokenExpirationTime('invalid_token');
      
      expect(expTime).toBe(0);
    });
  });
});

describe('Authentication Validation', () => {
  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123'
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });
  });

  describe('registerSchema', () => {
    it('should validate valid register data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };

      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'differentpassword'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        confirmPassword: 'password123'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        confirmPassword: '123'
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid change password data', () => {
      const validData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      };

      expect(() => changePasswordSchema.parse(validData)).not.toThrow();
    });

    it('should reject mismatched new passwords', () => {
      const invalidData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
        confirmPassword: 'differentpassword'
      };

      expect(() => changePasswordSchema.parse(invalidData)).toThrow();
    });

    it('should reject short new password', () => {
      const invalidData = {
        currentPassword: 'oldpassword123',
        newPassword: '123',
        confirmPassword: '123'
      };

      expect(() => changePasswordSchema.parse(invalidData)).toThrow();
    });

    it('should reject short current password', () => {
      const invalidData = {
        currentPassword: '123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      };

      expect(() => changePasswordSchema.parse(invalidData)).toThrow();
    });
  });
});