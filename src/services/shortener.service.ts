// src/services/shortener.service.ts
import { eq, sql } from 'drizzle-orm';
import { urls } from './../lib/db/schema';
import { EncodingService } from './encoding.service';
import { db } from './../lib/db';

export class ShortenerService {
  private encodingService = new EncodingService();
  private maxAttempts = 3;

  async createShortUrl(originalUrl: string, userId: number): Promise<{ shortCode: string }> {
    // First, check if this URL already exists for this user
    const existingUrl = await db
      .select({ shortCode: urls.shortCode })
      .from(urls)
      .where(
        sql`${urls.originalUrl} = ${originalUrl} AND ${urls.userId} = ${userId}`
      )
      .limit(1);

    if (existingUrl.length > 0) {
      return { shortCode: existingUrl[0].shortCode };
    }

    // URL doesn't exist, create a new one
    let attempts = 0;
    let shortCode: string;

    do {
      shortCode = this.encodingService.generateBase62Uuid();
      const result = await db
        .select({ shortCode: urls.shortCode })
        .from(urls)
        .where(eq(urls.shortCode, shortCode))
        .limit(1);

      if (result.length === 0) {
        // Short code is unique, use it
        try {
          await db.insert(urls).values({
            shortCode,
            originalUrl,
            userId,
          });
          return { shortCode };
        } catch (error) {
          // Handle unique constraint violation
          if (error instanceof Error && error.message.includes('duplicate key')) {
            attempts++;
            continue;
          }
          throw error;
        }
      }
      attempts++;
    } while (attempts < this.maxAttempts);

    throw new Error(`Could not generate a unique short code after ${this.maxAttempts} attempts.`);
  }

  async getOriginalUrl(shortCode: string): Promise<{ originalUrl: string } | null> {
    const result = await db
      .select({
        originalUrl: urls.originalUrl,
        isActive: urls.isActive
      })
      .from(urls)
      .where(eq(urls.shortCode, shortCode))
      .limit(1);

    if (result.length === 0) return null;

    const urlRecord = result[0];
    
    // Check if URL is active
    if (!urlRecord.isActive) {
      throw new Error('URL has been deactivated');
    }

    await db.update(urls)
      .set({ clicks: sql`${urls.clicks} + 1` })
      .where(eq(urls.shortCode, shortCode))
      .execute();

    return { originalUrl: urlRecord.originalUrl };
  }
}