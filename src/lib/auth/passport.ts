import { FastifyInstance, FastifyRequest } from 'fastify';
import { ExtractJwt, Strategy } from 'passport-jwt';
import passport from 'passport';
import { env } from '../../config';
import { db } from '../../lib/db';
import { users } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { User } from '../../lib/db/schema';

export interface AuthenticatedUser extends User {
  accessToken?: string;
  refreshToken?: string;
}

// Extend FastifyRequest to include user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export function setupPassport(fastify: FastifyInstance) {
  // Configure JWT strategy
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromExtractors([
      // Try to extract from cookie first
      (request) => {
        if (request && request.cookies && request.cookies.access_token) {
          return request.cookies.access_token;
        }
        return null;
      },
      // Fallback to Authorization header
      ExtractJwt.fromAuthHeaderAsBearerToken(),
    ]),
    secretOrKey: env.jwtSecret,
    issuer: 'url-shortner',
    audience: 'url-shortner-users',
  };

  const jwtStrategy = new Strategy(jwtOptions, async (payload, done) => {
    try {
      // Find user by ID from token payload
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  });

  // Use the strategy
  passport.use('jwt', jwtStrategy);

  // Initialize Passport
  fastify.addHook('onRequest', async (request, reply) => {
    return new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
        if (err) {
          return reject(err);
        }
        if (user) {
          request.user = user;
        }
        resolve();
      })(request.raw, reply.raw);
    });
  });
}