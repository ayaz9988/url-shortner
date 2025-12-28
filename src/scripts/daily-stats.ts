import { db } from '../lib/db';
import { urls, users } from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function generateDailyStats() {
  try {
    console.log('Generating daily statistics...');

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Total URLs created today
    const urlsCreatedToday = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(urls)
      .where(
        sql`${urls.createdAt} >= ${startOfDay.toISOString()} AND ${urls.createdAt} < ${endOfDay.toISOString()}`
      );

    // Total users registered today
    const usersRegisteredToday = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        sql`${users.createdAt} >= ${startOfDay.toISOString()} AND ${users.createdAt} < ${endOfDay.toISOString()}`
      );

    // Total clicks today
    const totalClicksToday = await db
      .select({ clicks: sql<number>`SUM(${urls.clicks})` })
      .from(urls)
      .where(
        sql`${urls.updatedAt} >= ${startOfDay.toISOString()} AND ${urls.updatedAt} < ${endOfDay.toISOString()}`
      );

    // Top 5 most clicked URLs today
    const topUrls = await db
      .select({
        shortCode: urls.shortCode,
        originalUrl: urls.originalUrl,
        clicks: urls.clicks
      })
      .from(urls)
      .orderBy(urls.clicks)
      .limit(5);

    console.log('\n=== Daily Statistics ===');
    console.log(`Date: ${today.toDateString()}`);
    console.log(`URLs created today: ${urlsCreatedToday[0]?.count || 0}`);
    console.log(`Users registered today: ${usersRegisteredToday[0]?.count || 0}`);
    console.log(`Total clicks today: ${totalClicksToday[0]?.clicks || 0}`);
    console.log('\nTop 5 most clicked URLs:');
    topUrls.forEach((url, index) => {
      console.log(`${index + 1}. ${url.shortCode} -> ${url.originalUrl} (${url.clicks} clicks)`);
    });

  } catch (error) {
    console.error('Error generating daily stats:', error);
    process.exit(1);
  }
}

generateDailyStats();