import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  private cache = new Map<string, { value: any; expiresAt?: number }>();

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.cache.set(key, { value, expiresAt });
  }

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async validate(key: string, value: any): Promise<boolean> {
    const stored = await this.get(key);
    return stored === value;
  }
}
