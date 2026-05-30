import { Context, Next } from 'hono';
import { verifyJWT } from '../utils/jwt';
import type { AppEnv } from '../types';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('userId', payload.sub);
    c.set('phone', payload.phone);
    await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    return c.json({ error: message }, 401);
  }
}
