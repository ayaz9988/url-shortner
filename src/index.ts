import app from './app';
import { registerRoutes } from './routes/v1';
import { env } from './config';
import redis from './lib/redis';

const server = app;

async function start() {
  try {
    await registerRoutes(server);
    await server.listen({ port: env.port, host: '0.0.0.0' });
    console.log(`Server running on port ${env.port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    await server.close();
    console.log('Fastify server closed');
    
    // Close Redis connection
    await redis.quit();
    console.log('Redis connection closed');
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

start();