import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';
import { env } from '../../config';

const client = postgres(env.databaseUrl);
export const db = drizzle(client, { schema });
export type DbType = typeof db;