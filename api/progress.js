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
const MAX_ID_LENGTH = 100;
const MAX_BODY_BYTES = 20_000; // generous; the real payload is a few hundred bytes
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isValidId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH && /^[A-Za-z0-9_-]+$/.test(id);
}

export default async function handler(req, res) {
  const id = req.query.id;

  if (!isValidId(id)) {
    return res.status(400).json({ error: 'missing or invalid id' });
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
      watched: body.watched.filter(n => Number.isInteger(n)).slice(0, 500),
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
