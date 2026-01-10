import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

if(process.env.NODE_ENV === 'test') config({ path: '.env.test'});

export default defineConfig({
  schema: './src/lib/db/schema',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: 'drizzle_migrations_urls', // Custom migration table
  },
});