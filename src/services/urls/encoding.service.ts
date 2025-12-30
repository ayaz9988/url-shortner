// src/services/encoding.service.ts
import uuid62 from '@bboss/uuid62'; // Different import

export class EncodingService {
  generateBase62Uuid(): string {
    
    return uuid62.v4(); 
  }

  decodeBase62Uuid(base62Str: string): string {
    return uuid62.decode(base62Str); 
  }

  isValidBase62(str: string): boolean {
    return uuid62.isValidBase62(str);
  }
}