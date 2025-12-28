import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { setupPassport } from './lib/auth/passport';
import { registerRoutes } from './routes/v1';
import { env } from './config';

const fastify = Fastify({
  logger: true,
  trustProxy: true, // Enable trust proxy for proper cookie handling
});

(async () => {
  // Register cookie support
  await fastify.register(fastifyCookie, {
    secret: env.jwtSecret, // for cookies signature
    parseOptions: {}     // options for parsing cookies
  });

  // Setup Passport with JWT strategy
  setupPassport(fastify);

  // Register all routes
  await registerRoutes(fastify);
})();

export default fastify;