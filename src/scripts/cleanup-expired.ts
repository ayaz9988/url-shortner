import { db } from '../lib/db';
import { urls } from '../lib/db/schema';
import { eq, lt, and } from 'drizzle-orm';

async function cleanupExpiredUrls() {
  try {
    console.log('Starting cleanup of expired URLs...');

    // Find URLs that are inactive and older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .delete(urls)
      .where(
        and(
          eq(urls.isActive, false),
          lt(urls.createdAt, thirtyDaysAgo)
        )
      );

    console.log(`Cleaned up ${result.length} expired URLs`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupExpiredUrls();