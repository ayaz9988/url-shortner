import { FastifyInstance } from 'fastify';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register v1 routes
  fastify.register(async (v1) => {
    
  }, { prefix: '/api/v1' });
}