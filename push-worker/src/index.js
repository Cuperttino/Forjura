// FORJURA: servidor de avisos de fin de descanso.
// La app pide un aviso para una hora concreta; un Durable Object espera con una alarma y envía la notificación.
import { DurableObject } from 'cloudflare:workers';
import { newVapidKeys, sendPush, unb64u } from './webpush.js';

const ORIGINS = ['https://cuperttino.github.io'];
const CONTACT = 'https://cuperttino.github.io/Forjura/';
const PUSH_HOSTS = /^(web\.push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
const MAX_AHEAD = 20 * 60 * 1000;

function validSub(s) {
  try {
    const u = new URL(s.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname) && unb64u(s.keys.p256dh).length === 65 && unb64u(s.keys.auth).length === 16;
  } catch (e) { return false; }
}
const clean = (v, n) => String(v || '').slice(0, n);
const GROUP = /^[0-9a-f]{32}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
function validTz(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; } }
/* local date parts of an instant in a time zone; dow is 0 = Monday, as in the app */
function zparts(ts, tz) {
  const o = {};
  for (const p of new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date(ts))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second, dow: (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday) + 6) % 7 };
}
const offsetAt = (ts, tz) => { const p = zparts(ts, tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000; };
function zonedTime(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetAt(guess, tz);
  t = guess - offsetAt(t, tz);
  return t;
}
const pad2 = n => String(n).padStart(2, '0');
/* every scheduled dose between from and to, as { key: 'YYYY-MM-DD|supp|dose', at } */
export function occurrences(items, tz, from, to) {
  const out = [];
  const p0 = zparts(from, tz);
  for (let off = -1; off <= 8; off++) {
    const p = zparts(zonedTime(p0.y, p0.m, p0.d + off, 12, 0, tz), tz), date = `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
    for (const it of items) {
      if (!it.days.includes(p.dow)) continue;
      const [h, mi] = it.t.split(':').map(Number), at = zonedTime(p.y, p.m, p.d, h, mi, tz);
      if (at > from && at <= to) out.push({ key: date + '|' + it.k, at, it });
    }
  }
  const seen = new Set();
  return out.filter(o => !seen.has(o.key) && seen.add(o.key)).sort((a, b) => a.at - b.at);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('origin') || '';
    const cors = { 'access-control-allow-origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'origin' };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (origin && !ORIGINS.includes(origin)) return json({ error: 'origin' }, 403);
    if (req.method === 'GET' && url.pathname === '/key') return json({ key: await env.PUSH.get(env.PUSH.idFromName('vapid')).publicKey() });
    if (req.method !== 'POST') return json({ error: 'not found' }, 404);
    let body;
    try { body = JSON.parse(await req.text()); } catch (e) { return json({ error: 'json' }, 400); }
    if (url.pathname === '/supps/status') {
      if (!body || !GROUP.test(body.group || '')) return json({ error: 'bad' }, 400);
      return json(await env.PUSH.get(env.PUSH.idFromName('group:' + body.group)).status(body.sub && body.sub.endpoint));
    }
    if (url.pathname === '/supps/sync') {
      if (!body || !GROUP.test(body.group || '') || !validTz(body.tz) || (body.sub && !validSub(body.sub))) return json({ error: 'bad' }, 400);
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 80).filter(x => x && typeof x.k === 'string' && x.k.length <= 60 && HHMM.test(x.t) && Array.isArray(x.days))
        .map(x => ({ k: x.k, t: x.t, days: x.days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6), title: clean(x.title, 80), body: clean(x.body, 140) }));
      const keys = list => (Array.isArray(list) ? list : []).slice(0, 400).filter(k => typeof k === 'string' && k.length <= 80);
      const snoozes = (Array.isArray(body.snoozes) ? body.snoozes : []).slice(0, 60).filter(x => x && typeof x.k === 'string' && Number(x.at) > 0)
        .map(x => ({ k: clean(x.k, 80), at: Number(x.at), title: clean(x.title, 80), body: clean(x.body, 140) }));
      const sub = body.sub ? { endpoint: body.sub.endpoint, keys: { p256dh: body.sub.keys.p256dh, auth: body.sub.keys.auth } } : null;
      await env.PUSH.get(env.PUSH.idFromName('group:' + body.group)).syncPlan({ rev: Number(body.rev) || 0, tz: body.tz, items, skip: keys(body.skip), snoozes, sub, drop: !!body.drop });
      return json({ ok: true });
    }
    if (!body || !validSub(body.sub)) return json({ error: 'sub' }, 400);
    const sub = { endpoint: body.sub.endpoint, keys: { p256dh: body.sub.keys.p256dh, auth: body.sub.keys.auth } };
    const job = env.PUSH.get(env.PUSH.idFromName('sub:' + sub.endpoint));
    if (url.pathname === '/schedule') {
      const at = Number(body.at), now = Date.now();
      if (!(at > now - 10000 && at < now + MAX_AHEAD)) return json({ error: 'at' }, 400);
      await job.schedule({ sub, at: Math.max(at, now), title: clean(body.title, 60) || 'Descanso terminado', body: clean(body.body, 140) });
      return json({ ok: true });
    }
    if (url.pathname === '/cancel') { await job.cancel(); return json({ ok: true }); }
    if (url.pathname === '/status') return json((await job.lastSend()) || {});
    return json({ error: 'not found' }, 404);
  }
};

export class Push extends DurableObject {
  // one instance named "vapid" keeps the key pair; one instance per device keeps its pending notice
  async keys() {
    let k = await this.ctx.storage.get('vapid');
    if (!k) await this.ctx.blockConcurrencyWhile(async () => {
      k = await this.ctx.storage.get('vapid');
      if (!k) { k = await newVapidKeys(); await this.ctx.storage.put('vapid', k); }
    });
    return k;
  }
  async publicKey() { return (await this.keys()).pub; }
  async schedule(job) { await this.ctx.storage.put('job', job); await this.ctx.storage.setAlarm(job.at); }
  async lastSend() { return this.ctx.storage.get('lastSend'); }
  async cancel() { await this.ctx.storage.delete('job'); await this.ctx.storage.deleteAlarm(); }
  /* supplement reminders: one instance per account (named by a random key the app keeps in the account data) */
  async syncPlan(m) {
    const now = Date.now();
    const g = (await this.ctx.storage.get('group')) || { rev: 0, tz: m.tz, items: [], skip: [], snoozes: [], subs: [], fired: {}, last: now };
    if (m.rev >= g.rev) { g.rev = m.rev; g.items = m.items; g.tz = m.tz; }
    g.skip = m.skip; g.snoozes = m.snoozes.filter(x => x.at > now - 60000);
    if (m.sub) {
      g.subs = g.subs.filter(x => x.endpoint !== m.sub.endpoint);
      if (!m.drop) g.subs = [m.sub, ...g.subs].slice(0, 10);
    }
    g.synced = now;
    await this.ctx.storage.put('group', g);
    await this.planAlarm(g);
  }
  async status(endpoint) {
    const g = await this.ctx.storage.get('group');
    if (!g) return { exists: false };
    const alarm = await this.ctx.storage.getAlarm();
    return { exists: true, synced: g.synced || null, tz: g.tz, items: g.items.length, devices: g.subs.length, thisDevice: !!endpoint && g.subs.some(s => s.endpoint === endpoint), next: alarm || null, log: (g.log || []).slice(-12) };
  }
  async planAlarm(g) {
    const now = Date.now(), skip = new Set(g.skip);
    let next = Infinity;
    if (g.subs.length) {
      const o = occurrences(g.items, g.tz, now, now + 8 * 864e5).find(x => !skip.has(x.key) && !g.fired[x.key]);
      if (o) next = o.at;
      for (const z of g.snoozes) if (!g.fired[z.k + '@' + z.at] && z.at < next) next = z.at;
    }
    if (next === Infinity) await this.ctx.storage.deleteAlarm(); else await this.ctx.storage.setAlarm(Math.max(next, now + 500));
  }
  async alarmGroup(g) {
    const now = Date.now(), skip = new Set(g.skip), due = [];
    g.log = g.log || [];
    for (const o of occurrences(g.items, g.tz, Math.max(g.last, now - 30 * 60000), now + 1000)) {
      if (skip.has(o.key)) { g.log.push({ t: now, k: o.key, r: 'skip' }); continue; }
      if (!g.fired[o.key]) { g.fired[o.key] = now; due.push({ title: o.it.title, body: o.it.body, tag: 'supp-' + o.key, k: o.key }); }
    }
    for (const z of g.snoozes) if (z.at <= now + 1000 && z.at > now - 30 * 60000 && !skip.has(z.k) && !g.fired[z.k + '@' + z.at]) { g.fired[z.k + '@' + z.at] = now; due.push({ title: z.title, body: z.body, tag: 'supp-' + z.k, k: z.k }); }
    g.last = now;
    g.log = g.log.slice(-30);
    for (const k in g.fired) if (now - g.fired[k] > 3 * 864e5) delete g.fired[k];
    if (due.length) {
      const keys = await this.env.PUSH.get(this.env.PUSH.idFromName('vapid')).keys(), gone = new Set();
      for (const n of due) {
        const codes = [];
        for (const sub of g.subs) {
          try {
            const r = await sendPush(sub, JSON.stringify({ title: n.title, body: n.body, tag: n.tag, url: './?go=supps' }), keys, CONTACT);
            codes.push(r.ok ? String(r.status) : r.status + ' ' + (await r.text()).slice(0, 80));
            if (r.status === 404 || r.status === 410) gone.add(sub.endpoint);
          } catch (e) { codes.push('error'); }
        }
        g.log.push({ t: now, k: n.k, r: g.subs.length ? codes.join(',') : 'sin dispositivos' });
      }
      g.subs = g.subs.filter(s => !gone.has(s.endpoint));
    }
    await this.ctx.storage.put('group', g);
    await this.planAlarm(g);
  }
  async alarm() {
    const g = await this.ctx.storage.get('group');
    if (g) return this.alarmGroup(g);
    const job = await this.ctx.storage.get('job');
    if (!job) return;
    await this.ctx.storage.delete('job');
    if (Date.now() - job.at > 2 * 60 * 1000) return; // too late to be useful
    const keys = await this.env.PUSH.get(this.env.PUSH.idFromName('vapid')).keys();
    const r = await sendPush(job.sub, JSON.stringify({ title: job.title, body: job.body, tag: 'forjura-rest', url: './' }), keys, CONTACT);
    await this.ctx.storage.put('lastSend', { t: Date.now(), status: r.status, text: (await r.text()).slice(0, 200) });
  }
}
