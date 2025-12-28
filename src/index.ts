import app, { setupApp } from './app';
import { env } from './config';
import redis from './lib/redis';
import { isPortAvailable, findAvailablePort } from './lib/utils';

const server = app;

async function checkDependencies(): Promise<void> {
  console.log('Checking dependencies...');
  
  try {
    // Check Redis connection
    console.log('Checking Redis connection...');
    await redis.ping();
    console.log('✓ Redis connection successful');
  } catch (error) {
    console.error('✗ Redis connection failed:', error);
    throw new Error('Redis connection failed. Please ensure Redis is running and accessible.');
  }
  
  // Check database connection (basic check)
  console.log('Checking database connection...');
  try {
    // Import db to trigger connection
    const { db } = await import('./lib/db');
    // Try a simple query to verify connection
    await db.execute('SELECT 1');
    console.log('✓ Database connection successful');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw new Error('Database connection failed. Please check your DATABASE_URL configuration.');
  }
}

async function checkPortAvailability(): Promise<number> {
  console.log(`Checking port availability on ${env.port}...`);
  
  if (await isPortAvailable(env.port)) {
    console.log(`✓ Port ${env.port} is available`);
    return env.port;
  } else {
    console.log(`✗ Port ${env.port} is not available, finding alternative...`);
    const availablePort = await findAvailablePort(env.port + 1);
    console.log(`✓ Found available port: ${availablePort}`);
    return availablePort;
  }
}

async function start() {
  try {
    console.log('Starting server initialization...');
    
    // Check dependencies first
    await checkDependencies();
    
    // Check port availability
    const actualPort = await checkPortAvailability();
    
    // Setup the application (this replaces the async IIFE in app.ts)
    console.log('Setting up application...');
    await setupApp();
    console.log('✓ Application setup completed');
    
    // Start the server
    console.log('Starting server...');
    server.listen({ port: actualPort, host: '0.0.0.0' }, (err) => {
      if (err) {
        console.error('Failed to start server:', err);
        throw err;
      }

    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  console.log('Current server state:', server.server ? 'Running' : 'Not running');
  
  try {
    // Stop accepting new connections
    await server.close();
    console.log('✓ Fastify server closed');
    
    // Close Redis connection
    await redis.quit();
    console.log('✓ Redis connection closed');
    
    console.log('✓ Graceful shutdown completed');
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