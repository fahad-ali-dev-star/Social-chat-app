import { redisClient } from "../config/redis.js";

/**
 * Redis-backed HTTP response cache middleware.
 * Falls back transparently when Redis is not available.
 * @param {number} ttlSeconds - How long to cache the response
 */
export function cacheMiddleware(ttlSeconds = 60) {
  return async (req, res, next) => {
    if (!redisClient) return next();

    const key = `cache:${req.originalUrl}`;
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(JSON.parse(cached));
      }
    } catch {
      return next();
    }

    // Monkey-patch res.json to intercept and cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && redisClient) {
        redisClient.setex(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate all cache keys matching a pattern prefix.
 */
export async function invalidateCache(pattern) {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(`cache:${pattern}*`);
    if (keys.length > 0) await redisClient.del(...keys);
  } catch {
    // non-fatal
  }
}
