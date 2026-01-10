// src/tests/setup.ts
import { db } from '../lib/db';
import { users, urls } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// Clean up test database before each test
export async function cleanupTestDatabase() {
  try {
    // Delete all test data
    await db.delete(urls);
    // Don't delete users here to avoid conflicts with test user creation
  } catch (error) {
    console.warn('Database cleanup failed:', error);
  }
}

// Setup function that runs before all tests
beforeAll(async () => {
  // Ensure test database is clean
  await cleanupTestDatabase();
});

// Cleanup function that runs after each test
afterEach(async () => {
  await cleanupTestDatabase();
});

// Global test utilities
export const testHelpers = {
  cleanupTestDatabase,
};