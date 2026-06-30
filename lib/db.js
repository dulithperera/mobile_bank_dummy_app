// In production (Vercel), KV_REST_API_URL is set by the Vercel KV integration.
// Locally (next dev without vercel dev), we fall back to an in-memory store so the
// app runs without needing Redis credentials. Data is not persisted across restarts.
//
// Now integrated with Supabase. If Supabase environment variables are provided,
// it uses Supabase as the primary database, falling back to KV/in-memory if not available.

import { kv as vercelKv } from '@vercel/kv';
import { supabase } from './supabase';

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
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Supabase getAllSessions failed, falling back:', err.message);
    }
  }

  const len = await kv().llen('sessions');
  if (len === 0) return [];
  const items = await kv().lrange('sessions', 0, -1);
  return items.map(parse);
}

export async function getRecentSessions(n = 10) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('id', { ascending: false })
        .limit(n);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Supabase getRecentSessions failed, falling back:', err.message);
    }
  }

  const len = await kv().llen('sessions');
  if (len === 0) return [];
  const items = await kv().lrange('sessions', Math.max(0, len - n), -1);
  return items.map(parse).reverse();
}

export async function getSessionCount() {
  if (supabase) {
    try {
      const { count, error } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Supabase getSessionCount failed, falling back:', err.message);
    }
  }

  return kv().llen('sessions');
}

export async function appendSession(row) {
  if (supabase) {
    try {
      const { id: _id, ...rowWithoutId } = row; // id is BIGSERIAL — let Supabase assign it
      const { error } = await supabase
        .from('sessions')
        .insert([rowWithoutId]);
      if (error) throw error;
      return getSessionCount();
    } catch (err) {
      console.error('Supabase appendSession failed, falling back:', err.message);
    }
  }

  return kv().rpush('sessions', JSON.stringify(row));
}

export async function getNextSessionId() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      if (error) throw error;
      const maxId = data && data[0] ? data[0].id : 0;
      return maxId + 1;
    } catch (err) {
      console.error('Supabase getNextSessionId failed, falling back:', err.message);
    }
  }

  return kv().incr('nextSessionId');
}

// ── OTP Challenges ────────────────────────────────────────────────────────────

export async function setChallenge(id, data) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('challenges')
        .upsert({
          id,
          phone_number: data.phoneNumber,
          code: data.code,
          label: data.label,
          requested_at: data.requestedAt,
          rerequest_count: data.rerequestCount,
          failed_attempts: data.failedAttempts
        });
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Supabase setChallenge failed, falling back:', err.message);
    }
  }

  await kv().set(`challenge:${id}`, JSON.stringify(data));
}

export async function getChallenge(id) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // not found
        throw error;
      }
      if (!data) return null;
      return {
        phoneNumber: data.phone_number,
        code: data.code,
        label: data.label,
        requestedAt: Number(data.requested_at),
        rerequestCount: Number(data.rerequest_count),
        failedAttempts: Number(data.failed_attempts)
      };
    } catch (err) {
      console.error('Supabase getChallenge failed, falling back:', err.message);
    }
  }

  return parse(await kv().get(`challenge:${id}`));
}

export async function updateChallenge(id, updates) {
  if (supabase) {
    try {
      const existing = await getChallenge(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };
      const { error } = await supabase
        .from('challenges')
        .update({
          phone_number: updated.phoneNumber,
          code: updated.code,
          label: updated.label,
          requested_at: updated.requestedAt,
          rerequest_count: updated.rerequestCount,
          failed_attempts: updated.failedAttempts
        })
        .eq('id', id);
      if (error) throw error;
      return updated;
    } catch (err) {
      console.error('Supabase updateChallenge failed, falling back:', err.message);
    }
  }

  const existing = await getChallenge(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await kv().set(`challenge:${id}`, JSON.stringify(updated));
  return updated;
}

// ── Participants ──────────────────────────────────────────────────────────────

export async function getParticipant(id) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // not found
        throw error;
      }
      if (!data) return null;
      return {
        balance: Number(data.balance),
        avgAmount: Number(data.avg_amount),
        beneficiaries: data.beneficiaries,
        lastLoginTime: Number(data.last_login_time)
      };
    } catch (err) {
      console.error('Supabase getParticipant failed, falling back:', err.message);
    }
  }

  return parse(await kv().get(`participant:${id}`));
}

export async function setParticipant(id, data) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('participants')
        .upsert({
          id,
          balance: data.balance,
          avg_amount: data.avgAmount,
          beneficiaries: data.beneficiaries,
          last_login_time: data.lastLoginTime
        });
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Supabase setParticipant failed, falling back:', err.message);
    }
  }

  await kv().set(`participant:${id}`, JSON.stringify(data));
}

// ── Mode ──────────────────────────────────────────────────────────────────────

export async function getCurrentMode() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('app_mode')
        .select('value')
        .eq('key', 'mode')
        .single();
      if (error) {
        if (error.code === 'PGRST116') return 'genuine'; // not found, use default
        throw error;
      }
      return (data && data.value) ?? 'genuine';
    } catch (err) {
      console.error('Supabase getCurrentMode failed, falling back:', err.message);
    }
  }

  return (await kv().get('mode')) ?? 'genuine';
}

export async function setCurrentMode(mode) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('app_mode')
        .upsert({ key: 'mode', value: mode });
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Supabase setCurrentMode failed, falling back:', err.message);
    }
  }

  await kv().set('mode', mode);
}