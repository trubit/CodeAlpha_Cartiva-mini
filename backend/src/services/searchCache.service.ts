/**
 * Search & Discovery In-Memory Cache Service
 * Provides fast, TTL-based caching for public category lists, product search results,
 * and autocomplete suggestions without external infrastructure dependencies like Redis.
 *
 * Designed with strict tenant and privacy safety:
 * - Public data only (no customer or administrative session data)
 * - Automatic eviction of expired entries
 * - Prefix-based invalidation upon catalog or category mutations
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SearchCacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;

  public static readonly TTL = {
    CATEGORIES: 300, // 5 minutes
    SUGGESTIONS: 120, // 2 minutes
    SEARCH_RESULTS: 60, // 60 seconds (prevents stale stock visibility)
    FEATURED: 300, // 5 minutes
    NEW_ARRIVALS: 180, // 3 minutes
  };

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Retrieves a cached value if present and unexpired.
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Stores a value in the cache with a specified TTL in seconds.
   */
  public set<T>(key: string, value: T, ttlSeconds: number): void {
    // Evict oldest entry if size exceeded
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Removes a specific key.
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidates all cache entries starting with the specified prefix.
   */
  public invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache (useful in tests or complete catalog resets).
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Generates a deterministic cache key from a prefix and query parameters.
   */
  public generateKey(prefix: string, params: Record<string, unknown> = {}): string {
    const sortedKeys = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .sort();

    const paramString = sortedKeys
      .map((k) => `${k}=${encodeURIComponent(String(params[k]))}`)
      .join('&');

    return `${prefix}:${paramString}`;
  }

  /**
   * Invalidation triggered when any product is created, modified, status changed, or deleted.
   */
  public invalidateProductCaches(): void {
    this.invalidatePrefix('prod:');
    this.invalidatePrefix('sugg:');
    this.invalidatePrefix('featured:');
    this.invalidatePrefix('new_arrivals:');
  }

  /**
   * Invalidation triggered when any category is created, modified, status changed, or deleted.
   */
  public invalidateCategoryCaches(): void {
    this.invalidatePrefix('cat:');
    this.invalidatePrefix('prod:');
    this.invalidatePrefix('sugg:');
  }
}

export const searchCacheService = new SearchCacheService();
