import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import {RedisStore} from 'connect-redis';
import redis from './lib/redis';
import { env } from './config';

const fastify = Fastify({ logger: true });

(async () => {
  await fastify.register(fastifyCookie);
  await fastify.register(fastifySession, {
    store: new RedisStore({ client: redis }),
    secret: env.jwtSecret,
    cookie: { secure: false },
  });
})();

export default fastify;