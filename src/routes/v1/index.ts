import { FastifyInstance } from 'fastify';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register v1 routes
  fastify.register(async (v1) => {
    // Register authentication routes
    const { authRoutes } = await import('./auth');
    v1.register(authRoutes, { prefix: '/auth' });
  }, { prefix: '/api/v1' });
}