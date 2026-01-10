import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import helmet from 'helmet';
import { registerRoutes } from './routes/v1';
import { env } from './config';

const fastify = Fastify({
  logger: {
    development: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    production: true,
    test: false,
  }[env.nodeEnv] ?? true,
});

// Setup function that returns a promise to fix race condition
export async function setupApp(): Promise<void> {
  try {
    console.log('Starting Fastify app setup...');
    
    // Register security middleware first
    console.log('Registering security middleware...');
    
    // Helmet for security headers
    await fastify.register(helmet as any, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    });
    console.log('Helmet security headers registered successfully');

    // CORS configuration
    await fastify.register(fastifyCors, {
      origin: env.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
    console.log('CORS middleware registered successfully');

    // Rate limiting
    await fastify.register(fastifyRateLimit, {
      max: env.rateLimitMax,
      timeWindow: `${env.rateLimitTimeWindow} minute`,
      skipOnError: true,
      allowList: ['127.0.0.1', '::1'],
    });
    console.log('Rate limiting middleware registered successfully');

    // Register cookie support
    console.log('Registering cookie plugin...');
    await fastify.register(fastifyCookie, {
      secret: env.jwtSecret, // for cookies signature
      parseOptions: {}     // options for parsing cookies
    });
    console.log('Cookie plugin registered successfully');

    // Register the root route
    console.log('Registering root route...');
    fastify.get("/", async (req, rep) => {
      console.log('Root route hit at:', new Date().toISOString());
      console.log('Request headers:', req.headers);
      console.log('Request method:', req.method);
      console.log('Request URL:', req.url);
      rep.status(200).send({
        message: `Server time ${new Date()}`,
        status: 'success'
      });
    });
    console.log('Root route registered successfully');

    // Register all routes
    console.log('Registering v1 routes...');
    await registerRoutes(fastify);
    console.log('All routes registered successfully');
    
    // Log all registered routes
    const routes = fastify.printRoutes();
    console.log('Registered routes:');
    console.log(routes);
  } catch (error) {
    console.error('Error during app setup:', error);
    throw error;
  }
}

export default fastify;
