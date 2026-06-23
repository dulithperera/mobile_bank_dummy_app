// In production (Vercel), KV_REST_API_URL is set by the Vercel KV integration.
// Locally (next dev without vercel dev), we fall back to an in-memory store so the
// app runs without needing Redis credentials. Data is not persisted across restarts.

import { kv as vercelKv } from '@vercel/kv';

const inMemory = {
  _data: new Map(),
  _lists: new Map(),

  async get(key) {
    return this._data.get(key) ?? null;
  },
  async set(key, value) {
    this._data.set(key, value);
  },
  async rpush(key, value) {
    if (!this._lists.has(key)) this._lists.set(key, []);
    this._lists.get(key).push(value);
    return this._lists.get(key).length;
  },
  async lrange(key, start, stop) {
    const list = this._lists.get(key) ?? [];
    return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
  },
  async llen(key) {
    return (this._lists.get(key) ?? []).length;
  },
  async incr(key) {
    const n = Number(this._data.get(key) ?? 0) + 1;
    this._data.set(key, n);
    return n;
  },
};

function kv() {
  return process.env.KV_REST_API_URL ? vercelKv : inMemory;
}

function parse(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function getAllSessions() {
  const len = await kv().llen('sessions');
  if (len === 0) return [];
  const items = await kv().lrange('sessions', 0, -1);
  return items.map(parse);
}

export async function getRecentSessions(n = 10) {
  const len = await kv().llen('sessions');
  if (len === 0) return [];
  const items = await kv().lrange('sessions', Math.max(0, len - n), -1);
  return items.map(parse).reverse();
}

export async function getSessionCount() {
  return kv().llen('sessions');
}

export async function appendSession(row) {
  return kv().rpush('sessions', JSON.stringify(row));
}

export async function getNextSessionId() {
  return kv().incr('nextSessionId');
}

// ── OTP Challenges ────────────────────────────────────────────────────────────

export async function setChallenge(id, data) {
  await kv().set(`challenge:${id}`, JSON.stringify(data));
}

export async function getChallenge(id) {
  return parse(await kv().get(`challenge:${id}`));
}

export async function updateChallenge(id, updates) {
  const existing = await getChallenge(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await kv().set(`challenge:${id}`, JSON.stringify(updated));
  return updated;
}

// ── Participants ──────────────────────────────────────────────────────────────

export async function getParticipant(id) {
  return parse(await kv().get(`participant:${id}`));
}

export async function setParticipant(id, data) {
  await kv().set(`participant:${id}`, JSON.stringify(data));
}

// ── Mode ──────────────────────────────────────────────────────────────────────

export async function getCurrentMode() {
  return (await kv().get('mode')) ?? 'genuine';
}

export async function setCurrentMode(mode) {
  await kv().set('mode', mode);
}