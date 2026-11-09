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
  async cancel() { await this.ctx.storage.delete('job'); await this.ctx.storage.deleteAlarm(); }
  async alarm() {
    const job = await this.ctx.storage.get('job');
    if (!job) return;
    await this.ctx.storage.delete('job');
    if (Date.now() - job.at > 2 * 60 * 1000) return; // too late to be useful
    const keys = await this.env.PUSH.get(this.env.PUSH.idFromName('vapid')).keys();
    await sendPush(job.sub, JSON.stringify({ title: job.title, body: job.body, tag: 'forjura-rest' }), keys, CONTACT);
  }
}
