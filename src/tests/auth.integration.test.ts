import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import app from '../app';

describe('Auth Endpoints Integration Tests', () => {
  let server: FastifyInstance;
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    server = app;
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    // Clean up database
    await db.delete(users);
    
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    const [createdUser] = await db.insert(users).values({
      email: 'test@example.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    testUser = createdUser;
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'newpassword123',
          confirmPassword: 'newpassword123',
        },
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      expect(result.message).toBe('Registration successful');
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.password).toBeUndefined();
      expect(response.cookies).toHaveLength(2);
      
      // Check if cookies are set
      const accessTokenCookie = response.cookies.find(c => c.name === 'access_token');
      const refreshTokenCookie = response.cookies.find(c => c.name === 'refresh_token');
      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();
    });

    it('should return 409 if user already exists', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'newpassword123',
          confirmPassword: 'newpassword123',
        },
      });

      expect(response.statusCode).toBe(409);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('User with this email already exists');
    });

    it('should return 400 if passwords do not match', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'password123',
          confirmPassword: 'differentpassword',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if password is too short', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: '123',
          confirmPassword: '123',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'testpassword123',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.message).toBe('Login successful');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBeUndefined();
      
      // Check if cookies are set
      const accessTokenCookie = response.cookies.find(c => c.name === 'access_token');
      const refreshTokenCookie = response.cookies.find(c => c.name === 'refresh_token');
      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();
    });

    it('should return 401 for invalid email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'testpassword123',
        },
      });

      expect(response.statusCode).toBe(401);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'testpassword123',
        },
      });

      const cookies = loginResponse.cookies;
      accessToken = cookies.find(c => c.name === 'access_token')?.value || '';
      refreshToken = cookies.find(c => c.name === 'refresh_token')?.value || '';
    });

    it('should refresh tokens successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: {
          cookie: `refresh_token=${refreshToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.message).toBe('Token refreshed successfully');
      
      // Check if new cookies are set
      const newAccessTokenCookie = response.cookies.find(c => c.name === 'access_token');
      const newRefreshTokenCookie = response.cookies.find(c => c.name === 'refresh_token');
      expect(newAccessTokenCookie).toBeDefined();
      expect(newRefreshTokenCookie).toBeDefined();
    });

    it('should return 401 if refresh token is not provided', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
      });

      expect(response.statusCode).toBe(401);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Refresh token not provided');
    });

    it('should return 403 for invalid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: {
          cookie: 'refresh_token=invalid_token',
        },
      });

      expect(response.statusCode).toBe(403);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Invalid refresh token');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'testpassword123',
        },
      });

      const cookies = loginResponse.cookies;
      accessToken = cookies.find(c => c.name === 'access_token')?.value || '';
    });

    it('should change password successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: {
          cookie: `access_token=${accessToken}`,
        },
        payload: {
          currentPassword: 'testpassword123',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.message).toBe('Password changed successfully. Please log in again.');
      
      // Verify old tokens are cleared
      const clearCookies = response.cookies.filter(c => c.value === '');
      expect(clearCookies.length).toBeGreaterThan(0);
    });

    it('should return 400 if current password is incorrect', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: {
          cookie: `access_token=${accessToken}`,
        },
        payload: {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        },
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should return 400 if new passwords do not match', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: {
          cookie: `access_token=${accessToken}`,
        },
        payload: {
          currentPassword: 'testpassword123',
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 if access token is not provided', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        payload: {
          currentPassword: 'testpassword123',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        },
      });

      expect(response.statusCode).toBe(401);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Access token not provided');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'testpassword123',
        },
      });

      const cookies = loginResponse.cookies;
      accessToken = cookies.find(c => c.name === 'access_token')?.value || '';
    });

    it('should logout successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          cookie: `access_token=${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.message).toBe('Logout successful');
      
      // Verify cookies are cleared
      const clearCookies = response.cookies.filter(c => c.value === '');
      expect(clearCookies.length).toBeGreaterThan(0);
    });

    it('should return 401 if access token is not provided', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'testpassword123',
        },
      });

      const cookies = loginResponse.cookies;
      accessToken = cookies.find(c => c.name === 'access_token')?.value || '';
    });

    it('should return current user info', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: `access_token=${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBeUndefined();
      expect(result.user.id).toBe(testUser.id);
    });

    it('should return 401 if access token is not provided', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});