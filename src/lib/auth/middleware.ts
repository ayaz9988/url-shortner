import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTService } from './jwt';
import { User } from '../db/schema';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: User;
}

/**
 * Authentication middleware that extracts and validates JWT from cookies
 */
export async function authenticateToken(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = JWTService.extractTokenFromCookie(request.headers.cookie);
    
    if (!token) {
      reply.code(401).send({ error: 'Access token not provided' });
      return;
    }

    const payload = JWTService.verifyAccessToken(token);
    
    // For now, we'll trust the token payload
    // In a real application, you might want to verify the user still exists
    request.user = {
      id: payload.userId,
      email: payload.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

  } catch (error) {
    reply.code(403).send({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export async function optionalAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = JWTService.extractTokenFromCookie(request.headers.cookie);
    
    if (token) {
      const payload = JWTService.verifyAccessToken(token);
      request.user = {
        id: payload.userId,
        email: payload.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
    }
  } catch (error) {
    // Silently continue without authentication
    request.user = undefined;
  }
}