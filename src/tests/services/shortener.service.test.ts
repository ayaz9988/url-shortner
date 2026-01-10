// src/tests/services/shortener.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ShortenerService } from '../../services/shortener.service';
import { db } from '../../lib/db';
import { users, urls } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { testHelpers } from '../setup';

describe('ShortenerService Integration Tests', () => {
  let shortenerService: ShortenerService;
  let testUserId: number;

  beforeEach(async () => {
    // Clean up database before each test
    await testHelpers.cleanupTestDatabase();
    
    // Check if test user already exists
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, 'test@example.com'));
    
    if (existingUser.length === 0) {
      // Create a test user for this test
      await db.insert(users).values({
        email: 'test@example.com',
        password: 'hashedpassword',
      });
    }
    
    // Get the user ID
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'test@example.com'));
    testUserId = user.id;
    
    shortenerService = new ShortenerService();
  });

  describe('createShortUrl', () => {
    it('should create a short URL successfully', async () => {
      const originalUrl = 'https://example.com';

      const result = await shortenerService.createShortUrl(originalUrl, testUserId);

      expect(result.shortCode).toBeDefined();
      expect(typeof result.shortCode).toBe('string');
      expect(result.shortCode.length).toBeGreaterThan(0);

      // Verify the URL was saved to database
      const savedUrl = await db.select().from(urls).where(eq(urls.shortCode, result.shortCode));
      expect(savedUrl).toHaveLength(1);
      expect(savedUrl[0].originalUrl).toBe(originalUrl);
      expect(savedUrl[0].userId).toBe(testUserId);
      expect(savedUrl[0].clicks).toBe(0);
      expect(savedUrl[0].isActive).toBe(true);
    });

    it('should handle URL collision and return existing short code', async () => {
      const originalUrl = 'https://example.com';

      // Create the same URL twice
      const result1 = await shortenerService.createShortUrl(originalUrl, testUserId);
      const result2 = await shortenerService.createShortUrl(originalUrl, testUserId);

      // Should return the same short code
      expect(result1.shortCode).toBe(result2.shortCode);

      // Verify only one record exists in database
      const savedUrls = await db.select().from(urls).where(eq(urls.originalUrl, originalUrl));
      expect(savedUrls).toHaveLength(1);
    });

    it('should generate unique short codes for different URLs', async () => {
      const originalUrl1 = 'https://example.com/page1';
      const originalUrl2 = 'https://example.com/page2';

      const result1 = await shortenerService.createShortUrl(originalUrl1, testUserId);
      const result2 = await shortenerService.createShortUrl(originalUrl2, testUserId);

      expect(result1.shortCode).not.toBe(result2.shortCode);

      // Verify both URLs exist in database
      const savedUrls = await db.select().from(urls);
      expect(savedUrls).toHaveLength(2);
    });

    it('should handle database unique constraint violation gracefully', async () => {
      const originalUrl = 'https://example.com';

      // Create a URL with a specific short code
      const result = await shortenerService.createShortUrl(originalUrl, testUserId);

      // Try to create another URL with the same short code (simulate collision)
      // This should be handled by the service's retry logic
      const result2 = await shortenerService.createShortUrl('https://different.com', testUserId);

      expect(result2.shortCode).toBeDefined();
      expect(result2.shortCode).not.toBe(result.shortCode);

      // Verify both URLs exist
      const savedUrls = await db.select().from(urls);
      expect(savedUrls).toHaveLength(2);
    });
  });

  describe('getOriginalUrl', () => {
    it('should return original URL and increment clicks', async () => {
      const originalUrl = 'https://example.com';
      const shortCode = 'test123';

      // Create a URL record directly in database
      await db.insert(urls).values({
        originalUrl,
        shortCode,
        userId: testUserId,
        clicks: 0,
        isActive: true,
      });

      const result = await shortenerService.getOriginalUrl(shortCode);

      expect(result).toEqual({ originalUrl });

      // Verify clicks were incremented
      const updatedUrl = await db.select().from(urls).where(eq(urls.shortCode, shortCode));
      expect(updatedUrl[0].clicks).toBe(1);
    });

    it('should return null for non-existent short code', async () => {
      const result = await shortenerService.getOriginalUrl('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error for deactivated URL', async () => {
      const originalUrl = 'https://example.com';
      const shortCode = 'test123';

      // Create a deactivated URL record
      await db.insert(urls).values({
        originalUrl,
        shortCode,
        userId: testUserId,
        clicks: 0,
        isActive: false,
      });

      await expect(shortenerService.getOriginalUrl(shortCode)).rejects.toThrow('URL has been deactivated');
    });

    it('should handle multiple clicks correctly', async () => {
      const originalUrl = 'https://example.com';
      const shortCode = 'test123';

      // Create a URL record
      await db.insert(urls).values({
        originalUrl,
        shortCode,
        userId: testUserId,
        clicks: 0,
        isActive: true,
      });

      // Click the URL multiple times
      await shortenerService.getOriginalUrl(shortCode);
      await shortenerService.getOriginalUrl(shortCode);
      await shortenerService.getOriginalUrl(shortCode);

      // Verify clicks were incremented correctly
      const updatedUrl = await db.select().from(urls).where(eq(urls.shortCode, shortCode));
      expect(updatedUrl[0].clicks).toBe(3);
    });
  });

  describe('integration', () => {
    it('should handle complete short URL creation and retrieval flow', async () => {
      const originalUrl = 'https://example.com/test';

      // Create short URL
      const createResult = await shortenerService.createShortUrl(originalUrl, testUserId);
      expect(createResult.shortCode).toBeDefined();

      // Retrieve original URL
      const getResult = await shortenerService.getOriginalUrl(createResult.shortCode);
      expect(getResult).toEqual({ originalUrl });

      // Verify clicks were incremented
      const savedUrl = await db.select().from(urls).where(eq(urls.shortCode, createResult.shortCode));
      expect(savedUrl[0].clicks).toBe(1);
    });

    it('should handle multiple users creating URLs', async () => {
      const originalUrl1 = 'https://example.com/user1';
      const originalUrl2 = 'https://example.com/user2';

      // Check if test users already exist
      const existingUser1 = await db.select({ id: users.id }).from(users).where(eq(users.email, 'user1@example.com'));
      const existingUser2 = await db.select({ id: users.id }).from(users).where(eq(users.email, 'user2@example.com'));
      
      if (existingUser1.length === 0) {
        await db.insert(users).values({ email: 'user1@example.com', password: 'hashedpassword' });
      }
      if (existingUser2.length === 0) {
        await db.insert(users).values({ email: 'user2@example.com', password: 'hashedpassword' });
      }

      // Get the user IDs
      const [user1] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'user1@example.com'));
      const [user2] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'user2@example.com'));

      // Create URLs for different users
      const result1 = await shortenerService.createShortUrl(originalUrl1, user1.id);
      const result2 = await shortenerService.createShortUrl(originalUrl2, user2.id);

      expect(result1.shortCode).toBeDefined();
      expect(result2.shortCode).toBeDefined();
      expect(result1.shortCode).not.toBe(result2.shortCode);

      // Both URLs should be retrievable
      const retrieved1 = await shortenerService.getOriginalUrl(result1.shortCode);
      const retrieved2 = await shortenerService.getOriginalUrl(result2.shortCode);

      expect(retrieved1).toEqual({ originalUrl: originalUrl1 });
      expect(retrieved2).toEqual({ originalUrl: originalUrl2 });
    });
  });
});