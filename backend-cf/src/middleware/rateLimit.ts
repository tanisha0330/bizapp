import type { Context, Next } from 'hono';
import type { AppEnv } from '../types';

interface RateLimitOptions {
  windowMs: number;    // Time window in milliseconds
  max: number;         // Max requests per window
  keyPrefix: string;   // KV key prefix
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return async (c: Context<AppEnv>, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const key = `rl:${keyPrefix}:${ip}`;

    try {
      const current = await c.env.CACHE.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= max) {
        return c.json(
          { error: 'Too many requests. Please try again later.' },
          429
        );
      }

      // Increment counter with TTL
      await c.env.CACHE.put(key, String(count + 1), { expirationTtl: windowSec });
    } catch {
      // If KV fails, allow the request (fail open)
    }

    await next();
  };
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  windowMs: 60_000,   // 1 minute
  max: 10,            // 10 auth attempts per minute
  keyPrefix: 'auth',
});

export const campaignLaunchRateLimit = rateLimit({
  windowMs: 60_000,
  max: 5,             // 5 campaign launches per minute
  keyPrefix: 'launch',
});

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,            // 60 general API calls per minute
  keyPrefix: 'api',
});

export const geminiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 15,            // 15 AI generations per minute
  keyPrefix: 'gemini',
});
