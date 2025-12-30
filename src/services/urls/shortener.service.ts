// src/services/shortener.service.ts
import { eq, sql } from 'drizzle-orm';
import { urls } from '../../lib/db/schema';
import { EncodingService } from './encoding.service';
import { db } from '../../lib/db';

export class ShortenerService {
  private encodingService = new EncodingService();
  private maxAttempts = 3;

  async createShortUrl(originalUrl: string): Promise<{ shortCode: string }> {
    let attempts = 0;
    let shortCode: string;
    let existingUrl: { originalUrl: string } | undefined;

    do {
      shortCode = this.encodingService.generateBase62Uuid();
      const result = await db
        .select({ originalUrl: urls.originalUrl })
        .from(urls)
        .where(eq(urls.shortCode, shortCode))
        .limit(1);

      existingUrl = result[0];
      attempts++;
    } while (existingUrl && attempts < this.maxAttempts);

    // Handle collision failure
    if (existingUrl) {
      if (existingUrl.originalUrl === originalUrl) {
        return { shortCode };
      }
      throw new Error(`Could not generate a unique short code after ${this.maxAttempts} attempts.`);
    }

    await db.insert(urls).values({
      shortCode,
      originalUrl,
    });

    return { shortCode };
  }

  async getOriginalUrl(shortCode: string): Promise<string | null> {
    const result = await db
      .select({ originalUrl: urls.originalUrl })
      .from(urls)
      .where(eq(urls.shortCode, shortCode))
      .limit(1);

    if (result.length === 0) return null;

    db.update(urls)
      .set({ clicks: sql`${urls.clicks} + 1` })
      .where(eq(urls.shortCode, shortCode))
      .execute();

    return result[0].originalUrl;
  }
}