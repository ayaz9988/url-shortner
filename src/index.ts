import app from './app';
import { registerRoutes } from './routes/v1';

async function start() {
  await registerRoutes(app);
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
}
start();