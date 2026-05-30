import { cors } from 'hono/cors';

const ALLOWED_ORIGINS = [
  'https://biz499-api.amitkumarsingh474.workers.dev',
  'https://biz499.com',
  'https://app.biz499.com',
  'exp://',  // Expo dev
];

export const corsMiddleware = cors({
  origin: (origin) => {
    // Mobile apps send no Origin header — deny from web context
    if (!origin) return '';
    // Allow exact matches and Expo dev prefixes
    if (ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o))) {
      return origin;
    }
    // Deny unknown web origins
    return '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});
