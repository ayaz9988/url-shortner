import { FastifyInstance } from 'fastify';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register v1 routes
  fastify.register(async (v1) => {
    // Individual route modules will be registered here
    // v1.register(authRoutes, { prefix: '/auth' });
    // v1.register(userRoutes, { prefix: '/users' });
  }, { prefix: '/api/v1' });
}