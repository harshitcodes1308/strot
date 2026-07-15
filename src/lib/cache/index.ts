import { db } from "@/lib/db";
import crypto from "crypto";

export interface CacheOptions {
  ttlSeconds: number;
}

export class CacheStore {
  /**
   * Generates a deterministic cache key
   */
  static generateKey(namespace: string, params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);
      
    const hash = crypto.createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
    return `${namespace}:${hash}`;
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const record = await db.enrichmentCache.findUnique({
        where: { cacheKey: key }
      });

      if (!record) return null;

      if (new Date() > record.expiresAt) {
        // Expired, delete and return null
        await db.enrichmentCache.delete({ where: { id: record.id } });
        return null;
      }

      return record.data as unknown as T;
    } catch (e) {
      console.error(`Cache GET error for ${key}:`, e);
      return null;
    }
  }

  static async set(key: string, type: string, data: any, options: CacheOptions): Promise<void> {
    const expiresAt = new Date(Date.now() + options.ttlSeconds * 1000);
    try {
      await db.enrichmentCache.upsert({
        where: { cacheKey: key },
        create: {
          cacheKey: key,
          cacheType: type,
          data: data,
          expiresAt
        },
        update: {
          data: data,
          expiresAt
        }
      });
    } catch (e) {
      console.error(`Cache SET error for ${key}:`, e);
    }
  }
}
