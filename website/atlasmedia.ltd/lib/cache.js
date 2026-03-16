const cache = new Map();

export function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.value;
}

export function setCache(key, value, ttlSeconds = 300) {
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return value;
}

export function invalidateCache(pattern) {
  for (const key of cache.keys()) { if (key.includes(pattern)) cache.delete(key); }
}

export function getCacheStats() {
  const now = Date.now(); let valid = 0, expired = 0;
  for (const [, entry] of cache.entries()) { if (now > entry.expiresAt) expired++; else valid++; }
  return { total: cache.size, valid, expired };
}

export async function withCache(key, ttlSeconds, fn) {
  const cached = getCache(key);
  if (cached !== null) return cached;
  const value = await fn();
  setCache(key, value, ttlSeconds);
  return value;
}
