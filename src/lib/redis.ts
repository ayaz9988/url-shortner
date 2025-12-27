import Redis from 'ioredis';
import { env } from '../config';
export default new Redis(env.redisUrl);