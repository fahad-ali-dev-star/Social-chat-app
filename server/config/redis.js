import Redis from "ioredis";

let redisClient = null;
let redisSubscriber = null;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    redisSubscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on("connect", () => console.log("Redis connected"));
    redisClient.on("error", (e) => console.warn("Redis error (non-fatal):", e.message));
  } catch (e) {
    console.warn("Redis init failed (non-fatal):", e.message);
    redisClient = null;
    redisSubscriber = null;
  }
} else {
  console.log("REDIS_URL not set — running without Redis (single-instance mode)");
}

export { redisClient, redisSubscriber };
