// src/services/shortener.service.ts
import { eq, sql } from 'drizzle-orm';
import { urls } from '../../lib/db/schema';
import { EncodingService } from './encoding.service';
import { db } from '../../lib/db';

export class ShortenerService {
  private encodingService = new EncodingService();
  private maxAttempts = 3;

  async createShortUrl(originalUrl: string, userId: number): Promise<{ shortCode: string }> {
    let attempts = 0;
    let shortCode: string;
    let existingUrl: { originalUrl: string; userId: number } | undefined;

    do {
      shortCode = this.encodingService.generateBase62Uuid();
      const result = await db
        .select({ originalUrl: urls.originalUrl, userId: urls.userId })
        .from(urls)
        .where(eq(urls.shortCode, shortCode))
        .limit(1);

      existingUrl = result[0] as { originalUrl: string; userId: number } | undefined;
      attempts++;
    } while (existingUrl && attempts < this.maxAttempts);

    // Handle collision failure
    if (existingUrl) {
      if (existingUrl.originalUrl === originalUrl) {
        return { shortCode };
      }
      throw new Error(`Could not generate a unique short code after ${this.maxAttempts} attempts.`);
    }

    try {
      await db.insert(urls).values({
        shortCode,
        originalUrl,
        userId,
      });
    } catch (error) {
      // Handle unique constraint violation
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error('Short code collision detected, please try again');
      }
      throw error;
    }

    return { shortCode };
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