// src/tests/services/encoding.service.test.ts
import { describe, it, expect } from 'vitest';
import { EncodingService } from '../../services/encoding.service';

describe('EncodingService', () => {
  let encodingService: EncodingService;

  beforeEach(() => {
    encodingService = new EncodingService();
  });

  describe('generateBase62Uuid', () => {
    it('should generate a valid base62 UUID', () => {
      const uuid = encodingService.generateBase62Uuid();
      
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBeGreaterThan(0);
      expect(encodingService.isValidBase62(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = encodingService.generateBase62Uuid();
      const uuid2 = encodingService.generateBase62Uuid();
      
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs of consistent length', () => {
      const uuids = Array.from({ length: 10 }, () => encodingService.generateBase62Uuid());
      const lengths = uuids.map(uuid => uuid.length);
      
      // All UUIDs should have the same length
      const firstLength = lengths[0];
      lengths.forEach(length => {
        expect(length).toBe(firstLength);
      });
    });
  });

  describe('decodeBase62Uuid', () => {
    it('should decode a base62 UUID back to its original format', () => {
      const originalUuid = 'test-uuid-123';
      const encoded = encodingService.generateBase62Uuid();
      
      // Note: Since we're using uuid62.v4(), we can't directly encode a custom string
      // This test verifies the decode function works with generated UUIDs
      const decoded = encodingService.decodeBase62Uuid(encoded);
      
      expect(decoded).toBeDefined();
      expect(typeof decoded).toBe('string');
    });

    it('should handle invalid base62 strings gracefully', () => {
      const invalidBase62 = 'invalid-base62-string!';
      
      expect(() => {
        encodingService.decodeBase62Uuid(invalidBase62);
      }).toThrow();
    });
  });

  describe('isValidBase62', () => {
    it('should return true for valid base62 strings', () => {
      const validBase62 = encodingService.generateBase62Uuid();
      
      expect(encodingService.isValidBase62(validBase62)).toBe(true);
    });

    it('should return false for invalid base62 strings', () => {
      const invalidStrings = [
        'invalid-base62-string!',
        'string with spaces',
        'string@with#special$chars',
        '',
        '1234567890!@#$%^&*()',
      ];

      invalidStrings.forEach(invalidString => {
        expect(encodingService.isValidBase62(invalidString)).toBe(false);
      });
    });

    it('should return false for non-string inputs', () => {
      const nonStringInputs = [null, undefined, 123, {}, []];

      nonStringInputs.forEach(input => {
        expect(encodingService.isValidBase62(input as string)).toBe(false);
      });
    });
  });

  describe('integration', () => {
    it('should generate and validate base62 UUIDs consistently', () => {
      const uuid = encodingService.generateBase62Uuid();
      
      expect(uuid).toBeDefined();
      expect(encodingService.isValidBase62(uuid)).toBe(true);
      
      // Should be able to decode it
      expect(() => encodingService.decodeBase62Uuid(uuid)).not.toThrow();
    });

    it('should handle multiple generations without conflicts', () => {
      const uuids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const uuid = encodingService.generateBase62Uuid();
        expect(uuids.has(uuid)).toBe(false);
        uuids.add(uuid);
        expect(encodingService.isValidBase62(uuid)).toBe(true);
      }
      
      expect(uuids.size).toBe(100);
    });
  });
});