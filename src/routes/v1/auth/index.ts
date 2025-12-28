import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { db } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { JWTService } from '../../../lib/auth/jwt';
import { authenticateToken } from '../../../lib/auth/middleware';
import { loginSchema, registerSchema, changePasswordSchema, LoginInput, RegisterInput, ChangePasswordInput } from '../../../services/validation/auth';
import { User } from '../../../lib/db/schema';

export async function authRoutes(fastify: FastifyInstance) {
  // Register endpoint
  fastify.post('/register', async (request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) => {
    try {
      // Validate input
      const validatedData = registerSchema.parse(request.body);
      const { email, password } = validatedData;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return reply.code(409).send({ error: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await db.insert(users).values({
        email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      if (!newUser || newUser.length === 0) {
        return reply.code(500).send({ error: 'Failed to create user' });
      }

      const user = newUser[0];

      // Generate tokens
      const accessToken = JWTService.generateAccessToken(user);
      const refreshToken = JWTService.generateRefreshToken(user);

      // Set cookies
      JWTService.setAuthCookies(reply, accessToken, refreshToken);

      // Return user info (without password)
      const { password: _, ...userWithoutPassword } = user;
      
      return reply.code(201).send({
        message: 'Registration successful',
        user: userWithoutPassword,
      });

    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Login endpoint
  fastify.post('/login', async (request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
    try {
      // Validate input
      const validatedData = loginSchema.parse(request.body);
      const { email, password } = validatedData;

      // Find user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Generate tokens
      const accessToken = JWTService.generateAccessToken(user);
      const refreshToken = JWTService.generateRefreshToken(user);

      // Set cookies
      JWTService.setAuthCookies(reply, accessToken, refreshToken);

      // Return user info (without password)
      const { password: _, ...userWithoutPassword } = user;
      
      return reply.send({
        message: 'Login successful',
        user: userWithoutPassword,
      });

    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Refresh token endpoint
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract refresh token from cookie
      const refreshToken = request.cookies?.refresh_token;
      
      if (!refreshToken) {
        return reply.code(401).send({ error: 'Refresh token not provided' });
      }

      // Verify refresh token
      const payload = JWTService.verifyRefreshToken(refreshToken);
      
      // Find user to ensure they still exist
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (!user) {
        JWTService.clearAuthCookies(reply);
        return reply.code(401).send({ error: 'User not found' });
      }

      // Generate new tokens
      const newAccessToken = JWTService.generateAccessToken(user);
      const newRefreshToken = JWTService.generateRefreshToken(user);

      // Set new cookies
      JWTService.setAuthCookies(reply, newAccessToken, newRefreshToken);

      return reply.send({
        message: 'Token refreshed successfully',
      });

    } catch (error) {
      JWTService.clearAuthCookies(reply);
      return reply.code(403).send({ error: 'Invalid refresh token' });
    }
  });

  // Change password endpoint
  fastify.post('/change-password', async (request: FastifyRequest<{ Body: ChangePasswordInput }>, reply: FastifyReply) => {
    try {
      // Extract and verify token manually since we have global auth
      const token = JWTService.extractTokenFromCookie(request.headers.cookie);
      
      if (!token) {
        return reply.code(401).send({ error: 'Access token not provided' });
      }

      const payload = JWTService.verifyAccessToken(token);
      
      // Find user to ensure they still exist
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      const validatedData = changePasswordSchema.parse(request.body);
      const { currentPassword, newPassword } = validatedData;

      // Find current user with password
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      if (!currentUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isCurrentPasswordValid) {
        return reply.code(400).send({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await db.update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Clear existing tokens by logging out
      JWTService.clearAuthCookies(reply);

      return reply.send({
        message: 'Password changed successfully. Please log in again.',
      });

    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Logout endpoint
  fastify.post('/logout', {
    preHandler: authenticateToken,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Clear cookies
      JWTService.clearAuthCookies(reply);

      return reply.send({
        message: 'Logout successful',
      });

    } catch (error) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user endpoint
  fastify.get('/me', {
    preHandler: authenticateToken,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as User;
      
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });

    } catch (error) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}