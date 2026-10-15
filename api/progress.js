// Vercel serverless function: /api/progress
//
// Stores and retrieves a small JSON blob (watched episode list, spoiler
// preference, sound preference) keyed by an anonymous sync code that the
// browser generates itself. No accounts, no login, no fingerprinting.
//
// Requires an Upstash Redis database attached to this project (Vercel
// dashboard -> Storage -> Marketplace -> Upstash -> Redis). That
// automatically sets the UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN environment variables this file reads.

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Basic guardrails: the sync code is client-generated, so keep the key
// space and payload size bounded.
const MIN_ID_LENGTH = 16; // client codes are UUIDs; short codes are guessable
const MAX_ID_LENGTH = 100;
const RATE_LIMIT = 60; // requests per IP per minute
const RATE_WINDOW_SECONDS = 60;
const MAX_BODY_BYTES = 20_000; // generous; the real payload is a few hundred bytes
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isValidId(id) {
  return typeof id === 'string' && id.length >= MIN_ID_LENGTH && id.length <= MAX_ID_LENGTH && /^[A-Za-z0-9_-]+$/.test(id);
}

// Fixed-window rate limit per client IP, kept in Redis so it holds across
// serverless instances. Fails open if Redis is briefly unavailable.
async function rateLimited(req) {
  try {
    const fwd = req.headers['x-forwarded-for'];
    const ip = (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') || req.socket?.remoteAddress || 'unknown';
    const bucket = Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1000));
    const rkey = `sgwatch:rl:${ip}:${bucket}`;
    const n = await redis.incr(rkey);
    if (n === 1) await redis.expire(rkey, RATE_WINDOW_SECONDS * 2);
    return n > RATE_LIMIT;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const id = req.query.id;

  if (!isValidId(id)) {
    return res.status(400).json({ error: 'missing or invalid id' });
  }

  if (await rateLimited(req)) {
    res.setHeader('Retry-After', String(RATE_WINDOW_SECONDS));
    return res.status(429).json({ error: 'too many requests' });
  }

  const key = `sgwatch:${id}`;

  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      return res.status(200).json({ data: data || null });
    } catch (err) {
      return res.status(500).json({ error: 'store read failed' });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    if (!body || typeof body !== 'object' || !Array.isArray(body.watched)) {
      return res.status(400).json({ error: 'invalid payload' });
    }
    if (JSON.stringify(body).length > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'payload too large' });
    }

    const record = {
      v: body.v === 2 ? 2 : 1,
      watched: [...new Set(body.watched.filter(n => Number.isInteger(n) && n >= 1 && n <= 1000))].slice(0, 500),
      spoilersHidden: !!body.spoilersHidden,
      soundOn: body.soundOn !== false,
      updatedAt: Date.now()
    };

    try {
      await redis.set(key, record, { ex: ONE_YEAR_SECONDS });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'store write failed' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
}
