import { redis } from "./redis";
import crypto from "crypto";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTimeMs: number;
  totalLimit: number;
  retryAfter?: number; // In seconds
}

export interface MessageRateLimiter {
  check(userId: string): Promise<RateLimitResult>;
  reset?(userId: string): Promise<void>;
}

export const MESSAGE_RATE_LIMIT_CONFIG = {
  LIMIT: parseInt(process.env.MESSAGE_RATE_LIMIT || "100", 10),
  WINDOW_SECONDS: parseInt(process.env.MESSAGE_RATE_WINDOW_SECONDS || "60", 10),
  ENABLED: process.env.MESSAGE_RATE_LIMIT_ENABLED !== "false",
};

/**
 * Atomic Redis Lua script for true sliding-window rate limiting using sorted sets (ZSET).
 * Keys:
 *   KEYS[1]: rate limit sorted set key (e.g. "message-rate:{userId}")
 * Arguments:
 *   ARGV[1]: current timestamp in ms
 *   ARGV[2]: sliding window duration in ms
 *   ARGV[3]: maximum allowed attempts in the window
 *   ARGV[4]: unique member identifier (timestamp:uuid)
 *   ARGV[5]: expiration time in seconds for the key
 * Returns:
 *   [allowedFlag (1 or 0), count, oldestScoreInWindow]
 */
const REDIS_SLIDING_WINDOW_LUA = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window_ms = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local member_id = ARGV[4]
  local expire_seconds = tonumber(ARGV[5])

  -- 1. Prune timestamps older than (now - window_ms)
  local clear_before = now - window_ms
  redis.call('ZREMRANGEBYSCORE', key, '-inf', clear_before)

  -- 2. Count remaining timestamps in active window
  local current_count = redis.call('ZCARD', key)

  if current_count >= limit then
    -- Fetch oldest score in current window to calculate precise retryAfter
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local oldest_score = now
    if oldest and #oldest >= 2 then
      oldest_score = tonumber(oldest[2])
    end
    redis.call('EXPIRE', key, expire_seconds)
    return {0, current_count, oldest_score}
  else
    -- Record current message attempt
    redis.call('ZADD', key, now, member_id)
    redis.call('EXPIRE', key, expire_seconds)
    return {1, current_count + 1, now}
  end
`;

/**
 * Production Redis-backed Sliding Window Rate Limiter
 */
export class RedisMessageRateLimiter implements MessageRateLimiter {
  private limit: number;
  private windowSeconds: number;
  private fallbackLimiter: InMemoryMessageRateLimiter;

  constructor(
    limit = MESSAGE_RATE_LIMIT_CONFIG.LIMIT,
    windowSeconds = MESSAGE_RATE_LIMIT_CONFIG.WINDOW_SECONDS
  ) {
    this.limit = limit;
    this.windowSeconds = windowSeconds;
    this.fallbackLimiter = new InMemoryMessageRateLimiter(limit, windowSeconds);
  }

  public async check(userId: string): Promise<RateLimitResult> {
    if (!MESSAGE_RATE_LIMIT_CONFIG.ENABLED) {
      return {
        allowed: true,
        remaining: this.limit,
        resetTimeMs: Date.now() + this.windowSeconds * 1000,
        totalLimit: this.limit,
        retryAfter: 0,
      };
    }

    const now = Date.now();
    const windowMs = this.windowSeconds * 1000;
    const redisKey = `message-rate:${userId}`;
    const memberId = `${now}:${crypto.randomUUID()}`;
    const expireSeconds = Math.max(120, this.windowSeconds * 2);

    try {
      const result = (await redis.eval(
        REDIS_SLIDING_WINDOW_LUA,
        1,
        redisKey,
        now.toString(),
        windowMs.toString(),
        this.limit.toString(),
        memberId,
        expireSeconds.toString()
      )) as [number, number, number];

      if (result && Array.isArray(result)) {
        const [allowedFlag, count, oldestScore] = result;
        const allowed = allowedFlag === 1;
        const retryAfter = allowed
          ? 0
          : Math.max(1, Math.ceil((oldestScore + windowMs - now) / 1000));
        const remaining = allowed ? Math.max(0, this.limit - count) : 0;
        const resetTimeMs = allowed ? now + windowMs : oldestScore + windowMs;

        return {
          allowed,
          remaining,
          resetTimeMs,
          totalLimit: this.limit,
          retryAfter,
        };
      }
    } catch (redisErr) {
      console.warn("Redis rate-limiter unavailable, using fallback in-memory limiter:", redisErr);
      return await this.fallbackLimiter.check(userId);
    }

    return await this.fallbackLimiter.check(userId);
  }

  public async reset(userId: string): Promise<void> {
    try {
      await redis.del(`message-rate:${userId}`);
    } catch {}
    await this.fallbackLimiter.reset(userId);
  }
}

/**
 * Instance-Local / In-Memory Sliding Window Rate Limiter
 * Uses per-user lock serialization to guarantee atomic evaluation during concurrent bursts.
 */
export class InMemoryMessageRateLimiter implements MessageRateLimiter {
  private userTimestamps = new Map<string, number[]>();
  private userLocks = new Map<string, Promise<void>>();
  private limit: number;
  private windowSeconds: number;

  constructor(
    limit = MESSAGE_RATE_LIMIT_CONFIG.LIMIT,
    windowSeconds = MESSAGE_RATE_LIMIT_CONFIG.WINDOW_SECONDS
  ) {
    this.limit = limit;
    this.windowSeconds = windowSeconds;

    // Periodic lazy cleanup of expired entries every minute
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), 60000).unref?.();
    }
  }

  public async check(userId: string): Promise<RateLimitResult> {
    if (!MESSAGE_RATE_LIMIT_CONFIG.ENABLED) {
      return {
        allowed: true,
        remaining: this.limit,
        resetTimeMs: Date.now() + this.windowSeconds * 1000,
        totalLimit: this.limit,
        retryAfter: 0,
      };
    }

    // Atomic per-user mutex chaining in single-threaded JS event loop
    const prevLock = this.userLocks.get(userId) || Promise.resolve();
    let releaseLock: () => void = () => {};
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.userLocks.set(userId, nextLock);

    await prevLock;

    try {
      const now = Date.now();
      const windowMs = this.windowSeconds * 1000;
      const clearBefore = now - windowMs;

      let timestamps = this.userTimestamps.get(userId) || [];
      timestamps = timestamps.filter((t) => t > clearBefore);

      if (timestamps.length >= this.limit) {
        const oldest = timestamps[0] || now;
        const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
        this.userTimestamps.set(userId, timestamps);

        return {
          allowed: false,
          remaining: 0,
          resetTimeMs: oldest + windowMs,
          totalLimit: this.limit,
          retryAfter,
        };
      }

      timestamps.push(now);
      this.userTimestamps.set(userId, timestamps);

      return {
        allowed: true,
        remaining: Math.max(0, this.limit - timestamps.length),
        resetTimeMs: now + windowMs,
        totalLimit: this.limit,
        retryAfter: 0,
      };
    } finally {
      if (this.userLocks.get(userId) === nextLock) {
        this.userLocks.delete(userId);
      }
      releaseLock();
    }
  }

  public async reset(userId: string): Promise<void> {
    this.userTimestamps.delete(userId);
  }

  public cleanup(): void {
    const now = Date.now();
    const clearBefore = now - this.windowSeconds * 1000;
    for (const [userId, timestamps] of this.userTimestamps.entries()) {
      const active = timestamps.filter((t) => t > clearBefore);
      if (active.length === 0) {
        this.userTimestamps.delete(userId);
      } else {
        this.userTimestamps.set(userId, active);
      }
    }
  }
}

// Authoritative message rate limiter singleton
export const messageRateLimiter: MessageRateLimiter = new RedisMessageRateLimiter();

const inMemoryRouteLimits = new Map<string, { count: number; resetAt: number }>();

function checkInMemoryRouteRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const current = inMemoryRouteLimits.get(key);

  if (!current || now >= current.resetAt) {
    inMemoryRouteLimits.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetTimeMs: now + windowMs,
      totalLimit: limit,
      retryAfter: 0,
    };
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetTimeMs: current.resetAt,
      totalLimit: limit,
      retryAfter,
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    resetTimeMs: current.resetAt,
    totalLimit: limit,
    retryAfter: 0,
  };
}

// General route rate limiter (fixed-window with Redis and in-memory fallback)
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = `ratelimit:${key}`;

  try {
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('TTL', KEYS[1])
      return {current, ttl}
    `;

    const result = (await redis.eval(
      luaScript,
      1,
      redisKey,
      windowSeconds.toString()
    )) as [number, number];

    if (result && Array.isArray(result)) {
      const [count, ttl] = result;
      const effectiveTtl = ttl > 0 ? ttl : windowSeconds;
      const resetTimeMs = now + effectiveTtl * 1000;
      const remaining = Math.max(0, limit - count);

      return {
        allowed: count <= limit,
        remaining,
        resetTimeMs,
        totalLimit: limit,
        retryAfter: count > limit ? effectiveTtl : 0,
      };
    }
  } catch {
    return checkInMemoryRouteRateLimit(key, limit, windowSeconds);
  }

  return checkInMemoryRouteRateLimit(key, limit, windowSeconds);
}

// Specific rate limit presets for other operations
export const RATE_LIMITS = {
  MESSAGE_SEND: { limit: 100, windowSeconds: 60 },
  MEDIA_UPLOAD: { limit: 10, windowSeconds: 60 },
  AUTH_ATTEMPT: { limit: 10, windowSeconds: 60 },
  CONVERSATION_CREATE: { limit: 15, windowSeconds: 60 },
  GIPHY_SEARCH: { limit: 30, windowSeconds: 60 },
};
