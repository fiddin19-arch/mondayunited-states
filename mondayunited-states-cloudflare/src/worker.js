/* Mondayunited States — versi Cloudflare Workers.
 * - Halaman (public/index.html) disajikan oleh Workers Static Assets.
 * - Setiap room = satu Durable Object "Room" yang memegang state rahasia dan koneksi WebSocket.
 * - Tidak ada pemain yang menjadi host; Durable Object-lah host-nya.
 */
import * as EngineModule from './engine.js';
const Engine = globalThis.Engine || EngineModule.default || EngineModule;

const STALE_MS = 6 * 3600 * 1000;   // room tak aktif 6 jam boleh dipakai ulang kodenya
const DROP_GRACE_MS = 6000;         // putus sebentar tidak langsung dianggap offline
const SAVE_EVERY_MS = 5000;   // hemat kuota "rows written" paket gratis

const META = new WeakMap();
const M = (ws) => META.get(ws);
const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/healthz') return new Response('ok');
    if (url.pathname === '/api/create' && request.method === 'POST') {
      for (let i = 0; i < 12; i++) {
        const code = String(1000 + Math.floor(Math.random() * 9000));
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const r = await stub.fetch('https://room/init?code=' + code, { method: 'POST' });
        if (r.status === 200) return json({ code });
      }
      return json({ err: 'Semua kursi sidang sedang terpakai. Coba lagi sebentar.' }, 503);
    }
    const m = /^\/ws\/(\d{4})$/.exec(url.pathname);
    if (m) {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Butuh WebSocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('not found', { status: 404 });
  },
};

async function pidFromToken(token) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mdu:' + token));
  return 'p_' + Array.from(new Uint8Array(h).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

export class Room {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.G = null; this.socks = new Set(); this.timer = null; this.lastRev = -1; this.savedAt = 0; this.saveTimer = null;
    state.blockConcurrencyWhile(async () => { const g = await state.storage.get('G'); this.G = this.G || g || null; });
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      const now = Date.now();
      if (this.G && now - (this.G.updatedAt || 0) < STALE_MS) return new Response('busy', { status: 409 });
      this.G = Engine.create(url.searchParams.get('code'), null, now);
      await this.state.storage.put('G', this.G);
      return new Response('ok');
    }
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      this.attach(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('not found', { status: 404 });
  }

  attach(ws) {
    META.set(ws, { pid: null });
    this.socks.add(ws);
    this.resumeClock();
    this.startTicking();
    ws.addEventListener('message', (ev) => { this.onMessage(ws, ev.data).catch((e) => console.error(e)); });
    const gone = () => this.onClose(ws);
    ws.addEventListener('close', gone);
    ws.addEventListener('error', gone);
  }

  send(ws, m) { try { ws.send(JSON.stringify(m)); } catch (e) {} }

  async onMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 16384) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    const reply = (res) => this.send(ws, { t: 'reply', id: m.id, res });
    const G = this.G, now = Date.now();

    if (m.t === 'hello') {
      if (typeof m.token !== 'string' || !/^[a-f0-9]{32}$/.test(m.token)) return;
      M(ws).pid = await pidFromToken(m.token);
      for (const o of this.socks) if (o !== ws && M(o).pid === M(ws).pid) { M(o).replaced = true; try { o.close(4000, 'replaced'); } catch (e) {} }
      const inRoom = !!(G && G.players.some((p) => p.id === M(ws).pid));
      this.send(ws, { t: 'welcome', pid: M(ws).pid, exists: !!G, lost: !inRoom && !!m.rejoin });
      if (inRoom) { Engine.setConnected(G, M(ws).pid, true, now); this.push(true); }
      return;
    }
    if (!M(ws).pid) return;
    if (m.t === 'join') {
      if (!G) return reply({ err: 'Room tidak terdaftar di KPU. Cek lagi kodenya.' });
      const r = Engine.join(G, M(ws).pid, { name: m.name, persona: m.persona }, now);
      reply(r.err ? r : { ok: true, code: G.code });
      this.push(true); return;
    }
    if (m.t === 'act') {
      if (!G) return reply({ err: 'Room tidak ditemukan.' });
      const a = m.a || {};
      const before = G.players.map((p) => p.id);
      const res = Engine.act(G, M(ws).pid, a, now);
      reply(res);
      if (a.t === 'kick' && res.ok) {
        const goneId = before.find((id) => !G.players.some((p) => p.id === id));
        for (const o of this.socks) if (M(o).pid === goneId) { this.send(o, { t: 'kicked', msg: 'Anda dikeluarkan dari ruang sidang oleh pemegang palu.' }); M(o).pid = null; }
      }
      if (a.t === 'leave') M(ws).left = true;
      this.push(); return;
    }
  }

  onClose(ws) {
    if (!this.socks.delete(ws)) return;
    const pid = M(ws).pid;
    if (pid && !M(ws).replaced) {
      setTimeout(() => {
        for (const o of this.socks) if (M(o).pid === pid) return; // sudah tersambung lagi
        if (this.G && Engine.setConnected(this.G, pid, false, Date.now())) this.push();
      }, DROP_GRACE_MS);
    }
    if (!this.socks.size) setTimeout(() => { if (!this.socks.size) { this.stopTicking(); this.save(true); } }, DROP_GRACE_MS + 500);
  }

  // Jam permainan berhenti saat tidak ada yang terhubung; saat ada yang kembali, semua timer digeser.
  resumeClock() {
    const G = this.G; if (!G || this.timer) return;
    const shift = Date.now() - (G.updatedAt || Date.now());
    if (shift < 5000 || G.phase === 'LOBBY' || G.phase === 'END') return;
    if (G.endsAt) G.endsAt += shift; if (G.pending) G.pending.at += shift; G.phaseStart += shift;
    Object.keys(G.botAt || {}).forEach((k) => (G.botAt[k] += shift)); G.fx = null; G.updatedAt = Date.now();
  }
  startTicking() {
    if (this.timer) return;
    this.timer = setInterval(() => { if (this.G && Engine.tick(this.G, Date.now())) this.push(); }, 200);
  }
  stopTicking() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  push(force) {
    const G = this.G; if (!G) return;
    if (force || this.lastRev !== G.rev) {
      this.lastRev = G.rev;
      const pub = Engine.publicView(G, Date.now());
      for (const ws of this.socks) {
        const pid = M(ws).pid; if (!pid || !G.players.some((p) => p.id === pid)) continue;
        this.send(ws, { t: 'state', pub, priv: Engine.privateView(G, pid) });
      }
    }
    this.save();
  }
  save(now) {
    if (!this.G) return;
    const due = Date.now() - this.savedAt >= SAVE_EVERY_MS;
    if (now || due) { this.savedAt = Date.now(); clearTimeout(this.saveTimer); this.saveTimer = null; this.state.storage.put('G', this.G).catch(() => {}); }
    else if (!this.saveTimer) this.saveTimer = setTimeout(() => this.save(true), SAVE_EVERY_MS);
  }
}
