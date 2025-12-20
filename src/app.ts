import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import {RedisStore} from 'connect-redis';
import redis from './lib/redis';

const fastify = Fastify({ logger: true });

await fastify.register(fastifyCookie);
await fastify.register(fastifySession, {
  store: new RedisStore({ client: redis }),
  secret: process.env.JWT_SECRET!,
  cookie: { secure: false },
});

export default fastify;