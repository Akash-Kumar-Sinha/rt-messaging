import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const globalForRedis = globalThis as unknown as {
  redisClient?: Redis;
  redisSub?: Redis;
  redisPub?: Redis;
};

export function createRedisClient(role = "default"): Redis {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  client.on("error", (err) => {
    // Log once, do not crash application
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[Redis:${role}] Connection warning:`, err.message);
    }
  });

  return client;
}

export const redis = globalForRedis.redisClient ?? createRedisClient("main");
export const redisPub = globalForRedis.redisPub ?? createRedisClient("pub");
export const redisSub = globalForRedis.redisSub ?? createRedisClient("sub");

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redis;
  globalForRedis.redisPub = redisPub;
  globalForRedis.redisSub = redisSub;
}

// Presence Helpers
const PRESENCE_PREFIX = "presence:user:";
const PRESENCE_SET = "presence:online_users";
const CONNECTION_TTL = 60; // 60s heartbeat

export async function setUserOnline(userId: string, connectionId: string): Promise<number> {
  try {
    const key = `${PRESENCE_PREFIX}${userId}`;
    await redis.sadd(key, connectionId);
    await redis.expire(key, CONNECTION_TTL);
    await redis.sadd(PRESENCE_SET, userId);
    return await redis.scard(key);
  } catch {
    return 1;
  }
}

export async function setUserOffline(userId: string, connectionId: string): Promise<number> {
  try {
    const key = `${PRESENCE_PREFIX}${userId}`;
    await redis.srem(key, connectionId);
    const count = await redis.scard(key);
    if (count === 0) {
      await redis.del(key);
      await redis.srem(PRESENCE_SET, userId);
    }
    return count;
  } catch {
    return 0;
  }
}

export async function refreshUserHeartbeat(userId: string, connectionId: string): Promise<void> {
  try {
    const key = `${PRESENCE_PREFIX}${userId}`;
    await redis.sadd(key, connectionId);
    await redis.expire(key, CONNECTION_TTL);
    await redis.sadd(PRESENCE_SET, userId);
  } catch {
    // Graceful ignore
  }
}

export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const key = `${PRESENCE_PREFIX}${userId}`;
    const exists = await redis.exists(key);
    if (exists === 0) {
      await redis.srem(PRESENCE_SET, userId).catch(() => {});
      return false;
    }
    const count = await redis.scard(key);
    if (count === 0) {
      await redis.del(key).catch(() => {});
      await redis.srem(PRESENCE_SET, userId).catch(() => {});
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function getOnlineUsers(): Promise<string[]> {
  try {
    const members = await redis.smembers(PRESENCE_SET);
    if (!members || members.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const id of members) {
      pipeline.exists(`${PRESENCE_PREFIX}${id}`);
    }
    const results = await pipeline.exec();
    const online: string[] = [];
    const stale: string[] = [];

    members.forEach((id, idx) => {
      const exists = results && results[idx] && results[idx][1] === 1;
      if (exists) {
        online.push(id);
      } else {
        stale.push(id);
      }
    });

    if (stale.length > 0) {
      await redis.srem(PRESENCE_SET, ...stale).catch(() => {});
    }

    return online;
  } catch {
    return [];
  }
}

// Ephemeral Typing Helpers
const TYPING_PREFIX = "typing:";
const TYPING_TTL = 4; // 4 seconds auto-expire

export async function setTypingState(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
  try {
    const key = `${TYPING_PREFIX}${conversationId}`;
    if (isTyping) {
      await redis.set(`${key}:${userId}`, "1", "EX", TYPING_TTL);
    } else {
      await redis.del(`${key}:${userId}`);
    }
  } catch {
    // Graceful ignore
  }
}

export async function getTypingUsers(conversationId: string): Promise<string[]> {
  try {
    const keys = await redis.keys(`${TYPING_PREFIX}${conversationId}:*`);
    return keys.map((k) => k.split(":").pop() || "");
  } catch {
    return [];
  }
}
