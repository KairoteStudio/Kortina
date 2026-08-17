import type { FileItem } from './fileSystem';
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
const CACHE_CONFIG = {
  DIRECTORY_CACHE_TTL: 120000,
  FILE_CACHE_TTL: 300000,
  MAX_CACHE_SIZE: 200
};
class FileCache {
  private cache = new Map<string, CacheItem<unknown>>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }
    this.accessOrder.set(key, ++this.accessCounter);
    return item.data as T;
  }
  set<T>(key: string, data: T, ttl: number): void {
    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    this.accessOrder.set(key, ++this.accessCounter);
  }
  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }
  clearPath(path: string): void {
    const normalizedPath = path.replace(/\\/g, '/');
    const dirPrefix = `dir:${normalizedPath}`;
    const filePrefix = `file:${normalizedPath}`;
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(normalizedPath) || key.startsWith(dirPrefix) || key.startsWith(filePrefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.delete(key));
  }
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
  getStats() {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
      keys: Array.from(this.cache.keys())
    };
  }
}
const fileCache = new FileCache();
function getDirectoryCacheKey(path: string): string {
  return `dir:${path.replace(/\\/g, '/')}`;
}
function getFileCacheKey(path: string): string {
  return `file:${path.replace(/\\/g, '/')}`;
}
export function cacheDirectory(path: string, items: FileItem[]): void {
  const key = getDirectoryCacheKey(path);
  fileCache.set(key, items, CACHE_CONFIG.DIRECTORY_CACHE_TTL);
}
export function getCachedDirectory(path: string): FileItem[] | null {
  const key = getDirectoryCacheKey(path);
  return fileCache.get<FileItem[]>(key);
}
export function cacheFile(path: string, content: string): void {
  const key = getFileCacheKey(path);
  fileCache.set(key, content, CACHE_CONFIG.FILE_CACHE_TTL);
}
export function getCachedFile(path: string): string | null {
  const key = getFileCacheKey(path);
  return fileCache.get<string>(key);
}
export function clearPathCache(path: string): void {
  fileCache.clearPath(path);
}
export function clearAllCache(): void {
  fileCache.clear();
}
export function getCacheStats() {
  return fileCache.getStats();
}