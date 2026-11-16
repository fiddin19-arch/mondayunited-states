/* UPKP Cakewalk — aplikasi web (frontend). Semua kunci jawaban & konten berbayar hanya dikirim server ke akun Premium. */
"use strict";
const app = document.getElementById("app");
let CFG = null, ME = null, sess = null, modal = null, V = { view: "loading", filter: "all" };
const L5 = ["A", "B", "C", "D", "E"];
const STAGES = [
  { n: 1, cake: "The Batter", name: "Pemanasan", desc: "Kenalan dulu sama semua jenis soal. Soalnya ringan, tanpa batas waktu.", specs: ["10 soal campuran", "Tanpa batas waktu"] },
  { n: 2, cake: "Oven Session", name: "Latihan per Topik", desc: "Panggang skill satu per satu, dengan batas waktu 75 detik per soal.", specs: ["6 topik", "10 soal · 75 detik/soal"] },
  { n: 3, cake: "Frosting Check", name: "Tryout Mini", desc: "Coba tampilan CAT: grid nomor, ragu-ragu, dan timer per sesi.", specs: ["2 sesi × 20 soal", "20 menit per sesi"] },
  { n: 4, cake: "Cake Day", name: "Simulasi CAT", desc: "Simulasi lengkap dengan skoring dan ambang batas tingkat kamu.", specs: ["Sesi 1: 60 soal · 60 menit", "Sesi 2: 45 soal · 45 menit"] },
];
const PASS_PCT = 60;

/* ---------- util ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const rp = n => "Rp" + fmt(n);
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const when = ts => new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const day = ts => new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
const ICON = {
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7M8 11h5"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z"/></svg>',
};
let toastT = null;
function toast(msg) { document.querySelector(".toast")?.remove(); const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 3500); }

async function api(path, opt = {}) {
  const r = await fetch("/api" + path, { method: opt.method || (opt.body ? "POST" : "GET"), headers: { "Content-Type": "application/json" }, body: opt.body ? JSON.stringify(opt.body) : undefined, credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || "Terjadi kesalahan. Coba lagi."); e.status = r.status; e.code = j.code; e.data = j; throw e; }
  return j;
}
function fail(e) {
  if (e.status === 401) { ME = null; go("auth"); return; }
  if (e.status === 402) { openPaywall(e.code === "quota" ? "quota" : "premium"); return; }
  toast(e.message);
}

/* ---------- navigasi ---------- */
const HASH_VIEWS = ["home", "materi", "tips", "latihan", "progress", "akun", "admin"];
function go(view, extra = {}) { Object.assign(V, { view, ...extra }); modal = null; render(); try { window.scrollTo(0, 0); } catch {} }
function nav(hash) { if (location.hash === "#" + hash) route(); else location.hash = hash; }
async function route() {
  if (!ME) return go("auth");
  if (V.view === "prac" || V.view === "cat" || V.view === "break") { /* sesi berjalan: abaikan perubahan hash */ }
  const [h, a, b] = location.hash.replace(/^#/, "").split("/");
  const v = HASH_VIEWS.includes(h) ? h : "home";
  try {
    if (v === "materi" && a) { const pg = await api(`/materi/${encodeURIComponent(a)}/${+b || 1}`); return go("read", { page: pg }); }
    if (v === "materi") { const books = await api("/materi"); return go("materi", { books }); }
    if (v === "tips") { const tips = await api("/tips"); return go("tips", { tips }); }
    if (v === "progress") { try { const pr = await api("/progress"); return go("progress", { pr, prLocked: null }); } catch (e) { if (e.status === 402) return go("progress", { pr: null, prLocked: e.data }); throw e; } }
    if (v === "akun") { const orders = await api("/pay/orders"); checkPendingOrder(); return go("akun", { orders }); }
    if (v === "admin" && ME.isAdmin) { const [stats, users] = await Promise.all([api("/admin/stats"), api("/admin/users")]); return go("admin", { stats, users, q: "" }); }
    go(v === "admin" ? "home" : v);
  } catch (e) {
    if (e.status === 402) { openPaywall("premium"); if (v === "materi") { const books = await api("/materi").catch(() => []); go("materi", { books }); modal = "pay"; render(); } return; }
    fail(e);
  }
}
window.addEventListener("hashchange", () => { if (["prac", "cat", "break"].includes(V.view)) return; route(); });

/* ---------- bagian umum ---------- */
const brand = `<a class="brand" href="#home" style="color:inherit;text-decoration:none"><span class="seal" aria-hidden="true">🍰</span><span>UPKP Cakewalk</span></a>`;
function band(inner, slim) { return `<header class="band"><div class="wrap" ${slim ? 'style="padding-block:16px 20px"' : ""}>${inner}</div></header>`; }
function topline() {
  return `<div class="topline">${brand}<div class="actions" style="align-items:center">
    ${ME.premium ? `<span class="chip-tk">${ICON.star.replace("<svg", '<svg width="13" height="13"')} Premium</span>` : `<button class="btn gold sm" data-act="paywall">Upgrade Premium</button>`}
    <button type="button" class="fxbtn" data-fx-btn aria-haspopup="dialog" aria-label="Suasana belajar: musik" onclick="FX.panel(this)">🎧<span class="fxl"> Suasana</span> ▾</button><button type="button" class="fxbtn" data-theme-btn aria-label="Tema dan warna" onclick="Theme.open(this)">🎨</button>
    <a class="btn-ghost-light" href="#akun" style="text-decoration:none">Akun</a></div></div>`;
}
function pageHead(title, sub) { return band(`${topline()}<h1 style="font-size:clamp(24px,4vw,34px)">${title}</h1>${sub ? `<p class="lead">${sub}</p>` : ""}`, true) + navbar(V.view); }
/* menu cepat: menempel di bawah header saat scroll; baris atas = menu, baris bawah = bagian di halaman ini */
const MAINNAV = [["home", "Dashboard"], ["materi", "Materi"], ["tips", "Tips & Trik"], ["latihan", "Latihan"], ["progress", "Progress"]];
function subsFor(view) {
  if (!ME) return [["sec-tingkat", "Pilih tingkat"], ["sec-paket", "Pilih paket"]];
  if (view === "home") return ME.tk ? [["sec-tingkat", "Tingkat"], ["sec-paket", "Paket"], ["layers", "4 Layer"], ["sec-bekal", "Bekal belajar"]] : [["sec-tingkat", "Tingkat"], ["sec-paket", "Paket"]];
  if (view === "materi") return (V.books || []).map((b, i) => ["bab-" + i, b.title]);
  if (view === "latihan" && ME.tk) return STAGES.map(s => ["stage-" + s.n, `${s.n}. ${s.cake}`]);
  return [];
}
function navbar(view) {
  const cur = { read: "materi", presult: "latihan" }[view] || view, subs = subsFor(view);
  const main = ME ? `<div class="snrow main">${MAINNAV.map(([h, t]) => `<a href="#${h}" ${cur === h ? 'class="on" aria-current="page"' : ""}>${t}</a>`).join("")}</div>` : "";
  const guest = ME ? "" : `<div class="sncta"><button type="button" class="btn-ghost sm" data-act="drawer" data-v="masuk">Masuk</button><button type="button" class="btn sm" data-act="drawer" data-v="daftar">Daftar</button></div>`;
  const sub = subs.length ? `<div class="snrow sub" role="group" aria-label="Loncat ke bagian">${subs.map(([id, t]) => `<button type="button" data-act="jump" data-v="${esc(id)}">${esc(t)}</button>`).join("")}</div>` : "";
  if (!main && !sub && !guest) return "";
  return `<nav class="subnav" aria-label="Menu cepat"><div class="wrap">${main}<div class="snmid">${sub}${guest}</div></div></nav>`;
}
const backHome = `<div class="crumb"><a href="#home">← Dashboard</a></div>`;
function footer() {
  return `<p class="foot">UPKP Cakewalk adalah latihan mandiri dan tidak berafiliasi dengan Kementerian Keuangan atau BPPK. Pembagian tingkat mengacu pada KMK 411/KMK.01/2002, sedangkan materi dan skoring mengacu pada Keputusan Kepala BPPK No. 215 Tahun 2023. Durasi sesi dan ambang Tes Potensi di sini adalah ketentuan latihan. Selalu cek pengumuman resmi unit kamu.</p>`;
}

/* ---------- auth ---------- */
function vAuth() {
  return band(`<div class="topline">${brand}<div class="actions" style="align-items:center">
      <button type="button" class="fxbtn" data-fx-btn aria-haspopup="dialog" aria-label="Suasana belajar: musik" onclick="FX.panel(this)">🎧<span class="fxl"> Suasana</span> ▾</button><button type="button" class="fxbtn" data-theme-btn aria-label="Tema dan warna" onclick="Theme.open(this)">🎨</button>
      <button type="button" class="btn-ghost-light" data-act="drawer" data-v="masuk">Masuk</button><button type="button" class="btn gold sm" data-act="drawer" data-v="daftar">Daftar</button></div></div>
    <h1>Ijazah udah upgrade, pangkat juga dong. <em>Lulus UPKP? Cakewalk.</em></h1>
    <p class="lead">Latihan UPKP Kemenkeu bertahap, mulai dari materi, tips, dan latihan soal sampai simulasi CAT. Daftar gratis untuk membaca semua materi dan mencoba ${CFG.freeQuestions} soal latihan di semua layer.</p>
    <div class="actions" style="margin-top:18px"><button type="button" class="btn gold" data-act="drawer" data-v="daftar">Daftar gratis</button><button type="button" class="btn-ghost-light" data-act="drawer" data-v="masuk">Sudah punya akun? Masuk</button></div>`) + navbar("auth") +
  `<main class="wrap" style="padding-block:8px 60px">
    <section id="sec-tingkat" style="margin-top:28px"><div class="sec-head"><div><h2>1. Kamu ikut UPKP tingkat berapa?</h2><p>Lihat-lihat dulu saja, tidak perlu akun. Pilih tingkat, lalu daftar kalau sudah siap mulai.</p></div></div>${tkCards(V.preTk, "preTk")}</section>
    <section id="sec-paket" style="margin-top:32px"><div class="sec-head"><div><h2>2. Pilih paket</h2><p>Mulai gratis dulu juga boleh. Upgrade bisa kapan saja dari dashboard.</p></div></div>${planCards("auth")}</section>
    <div style="height:28px"></div>${footer()}</main>`;
}
/* ---------- sidebar masuk / daftar: hanya muncul saat diklik ---------- */
let dwEl = null, dwOpener = null;
function drawerHTML() {
  const reg = V.authTab === "daftar";
  return `<div class="dw-head"><h2 id="dw-title">${reg ? "Buat akun" : "Masuk"}</h2><button type="button" class="dw-x" data-dw="close" aria-label="Tutup">×</button></div>
    <p class="dw-sub">${reg ? (V.preTk ? `Tingkat ${V.preTk} sudah kamu pilih.` : `Gratis: semua materi dan ${CFG.freeQuestions} soal latihan di semua layer.`) : "Selamat datang kembali."}</p>
    <div class="seg" role="tablist" style="align-self:flex-start"><button type="button" role="tab" class="${reg ? "" : "on"}" data-dw="tab" data-v="masuk">Masuk</button><button type="button" role="tab" class="${reg ? "on" : ""}" data-dw="tab" data-v="daftar">Daftar</button></div>
    <form id="authForm" class="dw-form" novalidate>
      ${reg ? `<div class="field"><label for="f-name">Nama</label><input id="f-name" name="name" autocomplete="name" required></div>` : ""}
      <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="f-pw">Password</label><input id="f-pw" name="password" type="password" autocomplete="${reg ? "new-password" : "current-password"}" minlength="8" required>${reg ? `<small style="color:var(--muted)">Minimal 8 karakter.</small>` : ""}</div>
      <div id="authMsg" aria-live="polite"></div>
      <button class="btn" type="submit">${reg ? (V.wantPremium ? "Buat akun & lanjut bayar" : "Buat akun gratis") : "Masuk"}</button>
      ${reg ? "" : `<small style="color:var(--muted)">Lupa password? Hubungi admin untuk reset.</small>`}
    </form>`;
}
function ensureDrawer() {
  if (dwEl) return dwEl;
  dwEl = document.createElement("div"); dwEl.className = "dw"; dwEl.hidden = true;
  dwEl.innerHTML = `<div class="dw-scrim" data-dw="close"></div><aside class="dw-panel" role="dialog" aria-modal="true" aria-labelledby="dw-title"></aside>`;
  document.body.appendChild(dwEl);
  dwEl.addEventListener("click", e => {
    const b = e.target.closest("[data-dw]"); if (!b) return;
    if (b.dataset.dw === "close") closeDrawer(); else if (b.dataset.dw === "tab") { V.authTab = b.dataset.v; drawRender(); }
  });
  dwEl.addEventListener("submit", e => { e.preventDefault(); if (e.target.id === "authForm") submitAuth(e.target); });
  dwEl.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const f = [...dwEl.querySelectorAll("button,input,a[href]")].filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && dwEl && !dwEl.hidden) closeDrawer(); });
  return dwEl;
}
function drawRender() { dwEl.querySelector(".dw-panel").innerHTML = drawerHTML(); (dwEl.querySelector("#f-name") || dwEl.querySelector("#f-email"))?.focus(); }
function openDrawer(tab) {
  ensureDrawer(); V.authTab = tab === "daftar" ? "daftar" : "masuk"; dwOpener = document.activeElement;
  drawRender(); dwEl.hidden = false; void dwEl.offsetWidth; dwEl.classList.add("open"); document.body.classList.add("noscroll"); (dwEl.querySelector("#f-name") || dwEl.querySelector("#f-email"))?.focus();
}
function closeDrawer() {
  if (!dwEl || dwEl.hidden) return; dwEl.classList.remove("open"); document.body.classList.remove("noscroll");
  setTimeout(() => { if (!dwEl.classList.contains("open")) dwEl.hidden = true; }, 260);
  dwOpener && dwOpener.focus && dwOpener.focus();
}
async function submitAuth(form) {
  const reg = V.authTab === "daftar", fd = Object.fromEntries(new FormData(form)), msg = document.getElementById("authMsg");
  try {
    ME = await api(reg ? "/auth/register" : "/auth/login", { body: fd }); dwOpener = null; closeDrawer();
    if (reg) toast("Akun dibuat. Selamat datang!");
    if (V.preTk && !ME.tk) ME = await api("/me", { method: "PATCH", body: { tk: V.preTk } }).catch(() => ME);
    location.hash = "home"; await route();
    if (V.wantPremium && !ME.premium) { V.wantPremium = false; pay(); }
  }
  catch (e) { msg.innerHTML = `<p class="msg bad">${esc(e.message)}</p>`; }
}

/* ---------- pilihan tingkat & paket ---------- */
const durasi = d => d <= 0 ? "selamanya" : d % 365 === 0 ? `${d / 365} tahun` : d % 30 === 0 ? `${d / 30} bulan` : `${d} hari`;
function tkCards(sel, act = "pickTk") {
  return `<div class="tk-grid">${Object.values(CFG.tingkat).map(t => `
    <button class="tk ${sel === t.id ? "on" : ""}" data-act="${act}" data-v="${t.id}" aria-pressed="${sel === t.id}"><span class="eyebrow">UPKP Tingkat</span><span class="roman">${t.id}</span>
      <dl class="meta"><dt>Ijazah</dt><dd>${t.ij}</dd><dt>Pangkat tujuan</dt><dd>${t.gol} (${t.gr})</dd><dt>Ambang Tes Potensi</dt><dd class="mono">${t.pg}</dd></dl>
      <span class="go">${sel === t.id ? "✓ Tingkat kamu" : "Pilih tingkat ini →"}</span></button>`).join("")}</div>`;
}
// ctx "auth" = sebelum login, "home" = di dashboard
function planCards(ctx) {
  const P = ME && ME.premium;
  const freeBtn = ctx === "auth" ? `<button class="btn line" data-act="plan" data-v="free">Mulai gratis</button>` : !P ? `<span class="tag free">Paket kamu saat ini · sisa ${ME.freeLeft} soal</span>` : `<span class="tag">Sudah termasuk di Premium</span>`;
  const premBtn = ctx === "auth" ? `<button class="btn gold" data-act="plan" data-v="premium">Daftar & upgrade</button>`
    : P ? `<span class="tag prem">${ICON.star}${ME.lifetime ? "Aktif selamanya" : "Aktif sampai " + day(ME.premiumUntil)}</span>` : `<button class="btn gold" data-act="pay">Upgrade ${rp(CFG.price)}</button>`;
  return `<div class="plans">
    <div class="plan ${ctx === "home" && !P ? "cur" : ""}"><span class="eyebrow">Free</span><div class="price">Rp0<small>coba dulu tanpa bayar</small></div>
      <ul><li>Semua materi, termasuk materi baru</li><li>${CFG.freeQuestions} soal latihan di semua layer</li><li>Kunci jawaban tanpa pembahasan</li><li>Tips & Trik lengkap</li><li class="no">Pembahasan setiap soal</li><li class="no">Latihan tanpa batas & Progress</li></ul>${freeBtn}</div>
    <div class="plan prem ${P ? "cur" : ""}"><span class="eyebrow" style="color:var(--gold)">Premium 🍰</span><div class="price">${rp(CFG.price)}<small>akses ${durasi(CFG.premiumDays)}</small></div>
      <ul><li>Semua materi, termasuk materi baru</li><li>Latihan tanpa batas di semua layer</li><li>Kunci jawaban + pembahasan setiap soal</li><li>Paket Psikotes Kerja (materi dan bank soal)</li><li>Tryout Mini & Simulasi CAT lengkap</li><li>Progress & topik terlemah</li></ul>${premBtn}</div>
  </div>`;
}
function upsell() {
  if (ME.premium) return "";
  return `<div class="upsell"><div><span class="eyebrow" style="color:var(--gold)">Premium</span><h3>Buka pembahasan dan latihan tanpa batas</h3>
    <ul><li>Latihan tanpa batas di keempat layer, termasuk Simulasi CAT penuh</li><li>Pembahasan lengkap setiap soal</li><li>Paket Psikotes Kerja: materi, tips, dan bank soal verbal, numerik, logika, kepribadian, spasial</li><li>Progress: nilai terbaik, topik terlemah, tren simulasi</li></ul></div>
    <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start"><div class="price">${rp(CFG.price)}<small>akses ${durasi(CFG.premiumDays)}</small></div><button class="btn gold" data-act="pay">Upgrade sekarang</button></div></div>`;
}

/* ---------- dashboard ---------- */
function vHome() {
  const t = ME.tk && CFG.tingkat[ME.tk], P = ME.premium;
  const card = (href, ic, title, desc, tag) => `<a class="mcard" href="#${href}"><span class="ic">${ic}</span><span><h3>${title}</h3><p>${desc}</p>${tag}</span></a>`;
  const tagFree = s => `<span class="tag free">${s}</span>`, tagLock = s => `<span class="tag prem">${ICON.lock}${s}</span>`, tagPrem = `<span class="tag prem">${ICON.star}Terbuka penuh</span>`;
  return band(`${topline()}
    <h1>Halo, ${esc(ME.name.split(" ")[0])}! <em>${t ? "Siap naik layer?" : "Mulai dari sini."}</em></h1>
    <p class="lead">${t ? `<span class="chip-tk">UPKP Tingkat ${t.id} · ${t.ij} → ${t.gol} (${t.gr})</span>` : "Pilih tingkat UPKP kamu, lalu tentukan mau coba gratis atau langsung Premium."}</p>`) + navbar("home") +
  `<main class="wrap">
    <section id="sec-tingkat"><div class="sec-head"><div><h2>1. Pilih tingkat UPKP</h2><p>Tingkat menentukan level soal dan ambang batas Tes Potensi. Bisa diganti kapan saja.</p></div></div>${tkCards(ME.tk)}</section>
    <section id="sec-paket"><div class="sec-head"><div><h2>2. Pilih paket</h2><p>${P ? "Kamu sudah Premium. Semua layer terbuka." : "Coba gratis dulu, atau langsung upgrade untuk membuka semuanya."}</p></div></div>${planCards("home")}</section>
    ${t ? `<section id="layers"><div class="sec-head"><div><h2>3. Empat layer menuju Cake Day</h2><p>${P ? "Urutan yang disarankan: Layer 1 → 2 (semua topik) → 3 → 4." : `Keempat layer memakai kuota gratis bersama (sisa <b>${ME.freeLeft}</b> soal). Pembahasan dan latihan tanpa batas terbuka dengan Premium.`}</p></div></div>
      <div class="path">${STAGES.map(stageHTML).join("")}</div></section>
    <section id="sec-bekal"><div class="sec-head"><div><h2>Bekal belajar</h2></div></div><div class="menu three">
      ${card("materi", ICON.book, "Materi", "Substansi Kemenkeu, keuangan negara, TWK, dan kepegawaian ASN.", P ? tagPrem : tagFree("Semua materi gratis"))}
      ${card("tips", ICON.bulb, "Tips & Trik", "Strategi CAT, trik Tes Potensi, dan soal sikap.", tagFree("Gratis"))}
      ${card("progress", ICON.chart, "Progress", "Nilai terbaik, akurasi per topik, dan tren simulasi.", P ? tagPrem : tagLock("Premium"))}
    </div></section>` : `<p class="note">Empat layer latihan muncul setelah kamu memilih tingkat.</p>`}
    ${ME.isAdmin ? `<p class="note">Kamu admin. <a href="#admin" style="color:var(--gold);font-weight:700">Buka panel admin →</a></p>` : ""}
    ${footer()}</main>`;
}

/* ---------- materi ---------- */
function vMateri() {
  const books = V.books || [];
  return pageHead("Materi", ME.premium ? "Semua bab terbuka. Baca berurutan, lalu uji di Latihan." : "Semua bab terbuka untuk akun gratis. Baca berurutan, lalu uji di Latihan.") +
  `<main class="wrap">${backHome}
    ${books.length ? books.map((b, bi) => `<div class="book" id="bab-${bi}"><h3>${esc(b.title)}${b.prem ? ` <span class="tag prem">${ICON.star}Paket Psikotes</span>` : ""}</h3><ol>${b.pages.map(p => `<li><button data-act="${p.locked ? "paywall" : "openPage"}" data-v="${esc(b.slug)}/${p.n}"><span><span class="no">${String(p.n).padStart(2, "0")}</span>${esc(p.title)}</span>${p.locked ? `<span class="tag prem">${ICON.lock}Premium</span>` : `<span style="color:var(--gold);font-weight:700">Baca →</span>`}</button></li>`).join("")}</ol></div>`).join("")
      : `<p class="note">Materi belum tersedia.</p>`}
    ${upsell()}${footer()}</main>`;
}
function vRead() {
  const p = V.page;
  const link = (x, label) => x ? `<button class="btn line" data-act="openPage" data-v="${esc(x.slug)}/${x.n}">${label}</button>` : "<span></span>";
  return pageHead(esc(p.book), `Halaman ${p.n} dari ${p.total}`) +
  `<main class="wrap"><div class="crumb"><a href="#home">Dashboard</a> / <a href="#materi">Materi</a> / <span>${esc(p.title)}</span></div>
    <article class="prose">${p.html}</article>
    <div class="pager">${link(p.prev, "← Sebelumnya")}${link(p.next, "Berikutnya →")}</div>
    <div class="actions"><a class="btn line" href="#latihan" style="text-decoration:none">Uji pemahaman di Latihan</a></div>${footer()}</main>`;
}

/* ---------- tips ---------- */
function vTips() {
  return pageHead("Tips & Trik", "Strategi singkat yang paling sering membantu peserta UPKP.") +
  `<main class="wrap">${backHome}${(V.tips || []).flatMap(b => b.pages.map(p => `<article class="prose">${p.html}</article>`)).join("") || `<p class="note">Tips belum tersedia.</p>`}${upsell()}${footer()}</main>`;
}

/* ---------- latihan ---------- */
function stageHTML(s) {
  const P = ME.premium, open = true;
  const act = s.n === 2
    ? `<div class="topics">${Object.entries(CFG.ucats).map(([k, n]) => `<button class="topic" data-act="start" data-v="2" data-cat="${k}">${n}<small>${["kmk", "asn", "twk"].includes(k) ? "Substansi & TWK" : "Tes Potensi"}</small></button>`).join("")}</div>`
    : `<div class="actions">${open ? `<button class="btn ${s.n === 4 ? "gold" : ""}" data-act="start" data-v="${s.n}">Mulai ${s.name.toLowerCase()}</button>` : `<button class="btn gold" data-act="paywall">${ICON.lock.replace("<svg", '<svg width="14" height="14" style="vertical-align:-2px;margin-right:4px"')}Buka dengan Premium</button>`}</div>`;
  return `<div class="stage ${open ? "open" : "locked"}" id="stage-${s.n}"><div class="node" aria-hidden="true">${s.n}</div>
    <div class="scard"><span class="eyebrow" style="color:var(--gold)">Layer ${s.n} · ${s.cake}</span><div class="row"><h3>Tahap ${s.n} · ${s.name}</h3></div>
      <p>${s.desc}</p><div class="specs">${s.specs.map(x => `<span class="spec">${x}</span>`).join("")}${P ? `<span class="spec">Pembahasan lengkap</span>` : `<span class="spec">Pakai kuota gratis</span>`}</div>${act}</div></div>`;
}
function vLatihan() {
  if (!ME.tk) return pageHead("Latihan", "Pilih tingkat UPKP dulu supaya level soalnya pas.") + `<main class="wrap">${backHome}${tkCards(null)}${footer()}</main>`;
  return pageHead("Empat layer menuju Cake Day", ME.premium ? "Semua layer terbuka. Urutan yang disarankan: 1 → 2 (semua topik) → 3 → 4." : `Kuota gratis kamu tersisa <b>${ME.freeLeft}</b> dari ${CFG.freeQuestions} soal, dipakai bersama di keempat layer. Sesi Tryout Mini dan Simulasi CAT diperpendek sesuai sisa kuota. Pembahasan dan latihan tanpa batas terbuka dengan Premium.`) +
  `<main class="wrap">${backHome}<div class="path">${STAGES.map(stageHTML).join("")}</div>${psikotesSection()}${upsell()}${footer()}</main>`;
}
function psikotesSection() {
  const P = ME.premium, groups = {};
  Object.entries(CFG.pcats || {}).forEach(([k, n]) => { (groups[CFG.pgroups[k]] = groups[CFG.pgroups[k]] || []).push([k, n]); });
  return `<section id="psikotes" style="margin-top:34px"><div class="sec-head"><div><h2>Paket Psikotes Kerja</h2><p>Bank soal psikotes untuk rekrutmen BUMN, multinasional, dan swasta. Tiap sesi 15 soal, urut dari mudah ke sulit, dengan kunci dan pembahasan langkah demi langkah. Materi dan tipsnya ada di menu Materi.</p></div>${P ? "" : `<span class="tag prem">${ICON.lock}Khusus Premium</span>`}</div>
    ${Object.entries(groups).map(([g, items]) => `<h3 style="margin:16px 0 8px;font-size:15px">${esc(g)}</h3><div class="topics">${items.map(([k, n]) => { const c = (CFG.pcount || {})[k] || 0; return c ? `<button class="topic" data-act="${P ? "start" : "paywall"}" data-v="5" data-cat="${k}">${esc(n)}<small>${c} soal${P ? "" : " · Premium"}</small></button>` : `<button class="topic" disabled style="opacity:.55">${esc(n)}<small>segera hadir</small></button>`; }).join("")}</div>`).join("")}
  </section>`;
}
async function startStage(mode, cat) {
  try {
    const s = await api("/practice/start", { body: { mode, cat } });
    sess = { ...s, mode, cat };
    if (s.kind === "prac") { sess.i = 0; sess.ans = []; sess.fb = []; sess.streak = 0; sess.qEnd = Date.now() + s.per * 1000; go("prac"); }
    else { sess.si = 0; sess.secs.forEach(x => { x.ans = Array(x.qs.length).fill(-1); x.flag = Array(x.qs.length).fill(false); x.cur = 0; }); sess.secs[0].end = Date.now() + sess.secs[0].dur * 1000; go("cat"); }
    if (!ME.premium) ME.freeLeft = s.freeLeft;
  } catch (e) { fail(e); }
}
// act "pans" = latihan (umpan balik setelah menjawab), "csel" = CAT (hanya pilihan), null = pembahasan
function optHTML(q, chosen, key, act, correct) {
  const reveal = act === null || (act === "pans" && chosen !== undefined);
  return `<div class="opts">${q.o.map((o, j) => {
    let c = "";
    if (reveal) {
      if (key !== undefined && key !== null) c = j === key ? "ok" : j === chosen ? "bad" : "";
      else if (j === chosen) c = correct ? "ok" : "bad";
    } else if (j === chosen) c = "sel";
    return `<button class="opt ${c}" ${act ? `data-act="${act}" data-v="${j}"` : ""} ${reveal || !act ? "disabled" : ""}><span class="L">${L5[j]}</span><span>${esc(o)}</span></button>`;
  }).join("")}</div>`;
}
function lockedExplain(what) {
  return `<div class="lockcard"><h3>${ICON.lock.replace("<svg", '<svg width="16" height="16"')} ${what} khusus Premium</h3><p>Kunci jawaban tersedia gratis. Premium menambahkan alasan di balik setiap jawaban, supaya kamu tahu kenapa salah dan tidak mengulanginya.</p><button class="btn gold sm" data-act="pay">Upgrade ${rp(CFG.price)}</button></div>`;
}
function vPrac() {
  const s = sess, q = s.qs[s.i], fb = s.fb[s.i], done = !!fb, n = s.qs.length;
  const left = s.per ? Math.max(0, Math.ceil((s.qEnd - Date.now()) / 1000)) : 0;
  const head = fb ? (fb.correct ? "Benar! 🎉" : s.ans[s.i] === -1 ? "Waktu habis." : "Belum tepat.") : "";
  return `<div class="pwrap">
    <div class="pbar"><button class="btn line sm" data-act="askQuit">‹ Keluar</button>
      <div class="prog"><i style="width:${(s.i + (done ? 1 : 0)) / n * 100}%"></i></div>
      <span class="mono">${s.i + 1}/${n}</span>${s.per ? `<span class="timer-s ${left <= 15 ? "low" : ""}" id="qt">${done ? "—" : mmss(left)}</span>` : ""}</div>
    <div class="eyebrow">${esc(s.title)}${s.streak >= 3 ? ` · <span class="streak">${s.streak} benar beruntun</span>` : ""}${!ME.premium ? ` · sisa kuota ${ME.freeLeft}` : ""}</div>
    <div class="qcard"><span class="catchip">${CFG.cats[q.k]}</span><div class="qtext">${q.t}</div>
      ${optHTML(q, done ? s.ans[s.i] : undefined, fb && fb.a, "pans", fb && fb.correct)}
      ${done ? (fb.e !== undefined ? `<div class="expl"><b>${head} Jawaban yang benar: ${L5[fb.a]}.</b>${fb.e}</div>` : `<p class="msg ${fb.correct ? "ok" : "bad"}"><b>${head} Jawaban yang benar: ${L5[fb.a]}.</b></p>${lockedExplain("Pembahasan")}`)
        + `<div class="actions"><button class="btn" data-act="pnext" id="pnext">${s.i + 1 < n ? "Soal berikutnya →" : "Lihat hasil"}</button></div>` : `<span class="kbd">Tekan A–E atau 1–5 untuk menjawab.</span>`}
    </div></div>`;
}
async function answer(choice) {
  const s = sess; if (s.fb[s.i] || s.busy) return; s.busy = true;
  try {
    const r = await api(`/practice/${s.id}/answer`, { body: { i: s.i, choice } });
    s.ans[s.i] = choice; s.fb[s.i] = r; s.streak = r.correct ? s.streak + 1 : 0;
    if (!ME.premium) ME.freeLeft = Math.max(0, ME.freeLeft - 1);
    render(); document.getElementById("pnext")?.focus({ preventScroll: true });
  } catch (e) { if (e.code === "quota") { await finishPrac(); openPaywall("quota"); } else fail(e); }
  finally { s.busy = false; }
}
async function finishPrac() {
  try { const r = await api(`/practice/${sess.id}/finish`, { body: {} }); sess.result = r; V.filter = "all"; go("presult"); window.FX && FX.result(r.pct >= PASS_PCT); }
  catch (e) { if (e.status === 400) { sess = null; nav("latihan"); } else fail(e); }
}
function reviewList(items, withRagu) {
  const f = V.filter;
  const list = items.map((it, i) => ({ ...it, no: i + 1 })).filter(it => f === "all" || (f === "wrong" && it.ans !== it.a) || (f === "flag" && it.flag));
  return `<div class="sec-head"><div><h2>${items.some(x => x.e) ? "Pembahasan" : "Kunci jawaban"}</h2></div><div class="seg">
    <button class="${f === "all" ? "on" : ""}" data-act="filter" data-v="all">Semua</button><button class="${f === "wrong" ? "on" : ""}" data-act="filter" data-v="wrong">Salah/kosong</button>
    ${withRagu ? `<button class="${f === "flag" ? "on" : ""}" data-act="filter" data-v="flag">Ragu-ragu</button>` : ""}</div></div>
  <div style="display:flex;flex-direction:column;gap:10px">${list.length ? list.map(it => {
    const st = it.ans === it.a ? ["ok", "BENAR"] : it.ans < 0 ? ["mid", "KOSONG"] : ["bad", "SALAH"];
    return `<article class="rv"><div class="rh"><span class="eyebrow">No. ${it.no} · ${CFG.cats[it.k]}${it.flag ? " · ragu-ragu" : ""}</span><span class="pill ${st[0]}">${st[1]}</span></div>
      <div class="qtext" style="font-size:15px">${it.t}</div>${optHTML(it, it.ans, it.a, null)}${it.e ? `<div class="expl">${it.e}</div>` : ""}</article>`;
  }).join("") : `<p class="note">Tidak ada soal di filter ini.</p>`}</div>`;
}
function vPResult() {
  const s = sess, r = s.result, ok = r.pct >= PASS_PCT;
  return `<div class="pwrap">
    <div class="verdict"><div class="eyebrow" style="color:inherit;opacity:.75">${esc(s.title)} · Tingkat ${ME.tk}</div>
      <div class="big ${ok ? "ok" : "bad"}">${r.b} dari ${r.n} benar · ${r.pct}%</div>
      <p style="margin:6px 0 0;opacity:.85">${ok ? "Mantap, adonannya jadi. Lanjut ke layer berikutnya!" : "Belum mengembang sempurna. Pelajari lagi materinya, lalu ulangi."}</p></div>
    <div class="actions">${ME.premium || ME.freeLeft > 0 ? `<button class="btn" data-act="retry">Ulangi dengan soal baru</button>` : ""}<a class="btn line" href="#latihan" data-act="leave" style="text-decoration:none">Kembali ke Latihan</a></div>
    ${!ME.premium && ME.freeLeft <= 0 ? `<p class="msg bad">Kuota ${CFG.freeQuestions} soal gratis kamu sudah habis.</p>` : ""}${!ME.premium ? lockedExplain("Pembahasan") : ""}${r.review ? reviewList(r.review, false) : ""}
  </div>`;
}

/* ---------- CAT ---------- */
function vCat() {
  const s = sess.secs[sess.si], q = s.qs[s.cur], n = s.qs.length;
  const ans = s.ans.filter(a => a >= 0).length, fl = s.flag.filter(Boolean).length, left = Math.max(0, Math.ceil((s.end - Date.now()) / 1000));
  return `<div class="cat">
    <div class="cat-top"><div class="in"><div class="who"><small>${esc(sess.title)} · UPKP Tingkat ${ME.tk} · Sesi ${sess.si + 1} dari ${sess.secs.length}</small><b>${esc(s.name)}</b></div>
      <div class="clock ${left <= 300 ? "low" : ""}" id="clock" aria-label="Sisa waktu">${mmss(left)}</div></div></div>
    <div class="cat-body">
      <section class="qpane"><div class="qhead"><b>Soal nomor ${s.cur + 1}</b><span class="catchip">${CFG.cats[q.k]}</span></div>
        <div class="qbody"><div class="qtext">${q.t}</div>${optHTML(q, s.ans[s.cur], undefined, "csel")}</div>
        <div class="qfoot"><button class="btn line" data-act="cprev" ${s.cur === 0 ? "disabled" : ""}>‹ Sebelumnya</button>
          <button class="btn ragu ${s.flag[s.cur] ? "on" : ""}" data-act="cflag">${s.flag[s.cur] ? "✓ " : ""}Ragu-ragu</button>
          ${s.cur < n - 1 ? `<button class="btn" data-act="cnext">Berikutnya ›</button>` : `<button class="btn gold" data-act="askFinish">Selesai sesi</button>`}</div></section>
      <aside class="side">
        <div class="counts"><div><b>${ans}</b><small>Dijawab</small></div><div><b>${fl}</b><small>Ragu-ragu</small></div><div><b>${n - ans}</b><small>Belum</small></div></div>
        <div class="legend"><span><i style="background:var(--ok);border-color:var(--ok)"></i>Dijawab</span><span><i style="background:var(--warn);border-color:var(--warn)"></i>Ragu-ragu</span><span><i></i>Belum</span></div>
        <div class="grid">${s.qs.map((_, i) => `<button class="gn ${s.flag[i] ? "flag" : s.ans[i] >= 0 ? "ans" : ""} ${i === s.cur ? "cur" : ""}" data-act="cjump" data-v="${i}" aria-label="Soal ${i + 1}">${i + 1}</button>`).join("")}</div>
        <button class="btn gold" data-act="askFinish">Selesai sesi ${sess.si + 1}</button>
        <button class="btn line sm" data-act="askQuit">Keluar tanpa menyimpan</button>
        <span class="kbd">Tombol cepat: A–E pilih jawaban, ← → pindah soal, R ragu-ragu.</span>
      </aside></div></div>`;
}
async function endSection() {
  modal = null;
  if (sess.si < sess.secs.length - 1) { sess.si++; return go("break"); }
  if (sess.submitting) return; sess.submitting = true;
  try {
    const r = await api(`/practice/${sess.id}/submit`, { body: { answers: sess.secs.map(x => x.ans), flags: sess.secs.map(x => x.flag) } });
    sess.result = r; V.filter = "all"; go("cresult"); window.FX && FX.result(r.pass);
  } catch (e) { sess.submitting = false; toast(e.message + " Jawaban masih tersimpan, coba kirim lagi."); modal = "retrySubmit"; render(); }
}
function vBreak() {
  const s = sess.secs[sess.si];
  return `<div class="pwrap"><div class="verdict"><div class="eyebrow" style="color:inherit;opacity:.75">${esc(sess.title)} · Tingkat ${ME.tk}</div>
    <div class="big">Sesi ${sess.si} selesai</div><p style="margin:6px 0 0;opacity:.85">Jawaban sesi sebelumnya sudah dikunci. Tarik napas, lalu lanjut.</p></div>
    <div class="scard"><h3>Sesi ${sess.si + 1}: ${esc(s.name)}</h3><div class="specs"><span class="spec">${s.qs.length} soal</span><span class="spec">${s.dur / 60} menit</span></div>
      <p>Siapkan kertas buram. Timer mulai berjalan saat tombol di bawah ditekan.</p><div class="actions"><button class="btn gold" data-act="startSec">Mulai sesi ${sess.si + 1}</button></div></div></div>`;
}
function vCResult() {
  const r = sess.result, t = CFG.tingkat[ME.tk];
  const box = rr => {
    const w = rr.key === "sub" ? rr.val : (rr.val - 200) / 6, m = rr.key === "sub" ? rr.pg : (rr.pg - 200) / 6;
    return `<div class="sbox"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span class="eyebrow">${esc(rr.name)}</span><span class="pill ${rr.pass ? "ok" : "bad"}">${rr.pass ? "MEMENUHI" : "DI BAWAH AMBANG"}</span></div>
      <div class="val">${fmt(rr.val)}</div><div class="meter"><i class="${rr.pass ? "ok" : "bad"}" style="width:${Math.max(0, Math.min(100, w))}%"></i><u style="left:${m}%"></u></div>
      <small>${rr.b} dari ${rr.n} benar · ambang ${rr.pg}${rr.key === "sub" ? " dari 100" : " (rentang 200–800)"}</small></div>`;
  };
  const weak = Object.entries(r.topics).sort((a, b) => a[1].b / a[1].n - b[1].b / b[1].n)[0];
  return `<div class="pwrap" style="max-width:860px">
    <div class="verdict"><div class="eyebrow" style="color:inherit;opacity:.75">Hasil ${esc(sess.title)} · UPKP Tingkat ${t.id}</div>
      <div class="big ${r.pass ? "ok" : "bad"}">${r.pass ? "Memenuhi ambang batas" : "Belum memenuhi ambang batas"}</div>
      <p style="margin:6px 0 0;opacity:.85">${r.pass ? "Cakewalk banget! Jaga performa dengan simulasi rutin." : "Fokuskan latihan ke topik terlemah, lalu ulangi."} Topik terlemah: <b>${CFG.cats[weak[0]]}</b> (${weak[1].b}/${weak[1].n}).</p></div>
    <div class="sgrid">${r.rs.map(box).join("")}</div>
    <p class="note">Psikotes tidak disimulasikan. Di ujian sebenarnya, kamu juga harus mendapat hasil "Direkomendasikan".</p>
    <section><div class="sec-head"><div><h2>Per topik</h2></div></div><div class="bars">${Object.entries(r.topics).map(([k, p]) => `<div class="bar"><span>${CFG.cats[k]}</span><div class="t"><i style="width:${p.b / p.n * 100}%"></i></div><span class="n">${p.b}/${p.n}</span></div>`).join("")}</div></section>
    <div class="actions"><button class="btn" data-act="retry">Ulangi dengan soal baru</button><button class="btn line" data-act="start" data-v="2" data-cat="${weak[0]}">Latih ${CFG.cats[weak[0]]}</button><a class="btn line" href="#progress" data-act="leave" style="text-decoration:none">Lihat Progress</a></div>
    <section>${!ME.premium ? lockedExplain("Pembahasan") : ""}${reviewList(r.review, true)}</section></div>`;
}

/* ---------- progress ---------- */
function trendSVG(sims) {
  if (sims.length < 2) return `<p class="note">Grafik tren muncul setelah kamu menyelesaikan minimal 2 Simulasi CAT.</p>`;
  const W = 640, H = 200, pl = 36, pr = 12, pt = 12, pb = 26, n = sims.length;
  const x = i => pl + i * (W - pl - pr) / (n - 1), y = v => pt + (100 - v) * (H - pt - pb) / 100;
  const potPct = v => (v - 200) / 6;
  const line = (f, col) => `<polyline fill="none" stroke="${col}" stroke-width="2.5" points="${sims.map((s, i) => `${x(i)},${y(f(s))}`).join(" ")}"/>` + sims.map((s, i) => `<circle cx="${x(i)}" cy="${y(f(s))}" r="${i === n - 1 ? 5 : 3.5}" fill="${col}"/>`).join("");
  const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join("");
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tren nilai Simulasi CAT">${grid}
    ${line(s => s.sub, "var(--navy-2)")}${line(s => potPct(s.pot), "var(--gold)")}
    ${sims.map((s, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">#${i + 1}</text>`).join("")}</svg>
    <div class="legend" style="margin-top:6px"><span><i style="background:var(--navy-2);border-color:var(--navy-2)"></i>Substansi & TWK (0–100)</span><span><i style="background:var(--gold);border-color:var(--gold)"></i>Tes Potensi (skala 200–800 → 0–100%)</span></div></div>`;
}
function vProgress() {
  if (!V.pr) {
    const c = V.prLocked?.count || 0;
    return pageHead("Progress", "Pantau perkembangan latihan kamu dari waktu ke waktu.") +
    `<main class="wrap">${backHome}<div class="lockcard"><h3>${ICON.lock.replace("<svg", '<svg width="16" height="16"')} Progress khusus Premium</h3>
      <p>${c ? `Ada <b>${c} sesi latihan</b> kamu yang sudah tersimpan.` : "Setiap latihan kamu tetap tersimpan."} Upgrade untuk melihat nilai terbaik per tahap, akurasi per topik, topik terlemah, dan tren Simulasi CAT.</p>
      <button class="btn gold" data-act="pay">Upgrade ${rp(CFG.price)}</button></div>
      <div class="blur" aria-hidden="true"><div class="stats"><div class="stat"><b>78%</b><small>Terbaik Pemanasan</small></div><div class="stat"><b>64%</b><small>Terbaik Tryout</small></div><div class="stat"><b>71,6</b><small>Substansi terakhir</small></div><div class="stat"><b>512</b><small>Potensi terakhir</small></div></div></div>
      ${footer()}</main>`;
  }
  const p = V.pr, last = p.sims[p.sims.length - 1];
  const topics = Object.entries(p.topics).sort((a, b) => a[1].b / a[1].n - b[1].b / b[1].n);
  const label = h => h.mode === 5 ? "Psikotes · " + (CFG.cats[h.cat] || "") : h.mode === 2 ? "Tahap 2 · " + (CFG.cats[h.cat] || "") : `Tahap ${h.mode} · ${STAGES[h.mode - 1].name}`;
  return pageHead("Progress", `UPKP Tingkat ${p.tk}. Data diambil dari semua latihan yang sudah kamu selesaikan.`) +
  `<main class="wrap">${backHome}
    <div class="stats"><div class="stat"><b>${p.best["1"] ?? "–"}${p.best["1"] != null ? "%" : ""}</b><small>Terbaik Pemanasan</small></div><div class="stat"><b>${p.best["3"] ?? "–"}${p.best["3"] != null ? "%" : ""}</b><small>Terbaik Tryout Mini</small></div>
      <div class="stat"><b>${last ? fmt(last.sub) : "–"}</b><small>Substansi & TWK (simulasi terakhir)</small></div><div class="stat"><b>${last ? last.pot : "–"}</b><small>Tes Potensi (simulasi terakhir)</small></div></div>
    <section><div class="sec-head"><div><h2>Akurasi per topik</h2><p>Diurutkan dari yang paling lemah. Latih topik teratas dulu.</p></div></div>
      ${topics.length ? `<div class="bars">${topics.map(([k, t]) => `<div class="bar"><span>${CFG.cats[k]}</span><div class="t"><i style="width:${t.b / t.n * 100}%"></i></div><span class="n">${Math.round(t.b / t.n * 100)}%</span></div>`).join("")}</div>
      <div class="actions" style="margin-top:12px"><button class="btn" data-act="start" data-v="${CFG.pcats && CFG.pcats[topics[0][0]] ? 5 : 2}" data-cat="${topics[0][0]}">Latih ${CFG.cats[topics[0][0]]}</button></div>` : `<p class="note">Belum ada data. Mulai dari menu Latihan.</p>`}</section>
    <section><div class="sec-head"><div><h2>Tren Simulasi CAT</h2><p>Sepuluh simulasi terakhir.</p></div></div>${trendSVG(p.sims)}</section>
    <section><div class="sec-head"><div><h2>Riwayat</h2></div></div>
      ${p.history.length ? `<div class="tbl"><table class="hist"><thead><tr><th>Waktu</th><th>Tingkat</th><th>Latihan</th><th>Skor</th><th>Status</th></tr></thead><tbody>
      ${p.history.map(h => `<tr><td>${when(h.created_at)}</td><td>${h.tk}</td><td>${label(h)}</td><td class="mono">${h.sub != null ? `${fmt(h.sub)} · ${h.pot}` : h.pct + "%"}</td><td>${h.pass != null ? `<span class="pill ${h.pass ? "ok" : "bad"}">${h.pass ? "LULUS" : "BELUM"}</span>` : `<span class="pill ${h.pct >= PASS_PCT ? "ok" : "mid"}">${h.pct >= PASS_PCT ? "TUNTAS" : "ULANGI"}</span>`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">Belum ada riwayat.</p>`}</section>
    ${footer()}</main>`;
}

/* ---------- akun & pembayaran ---------- */
function vAkun() {
  const st = { paid: ["ok", "LUNAS"], pending: ["mid", "MENUNGGU"], failed: ["bad", "GAGAL"], expired: ["bad", "KEDALUWARSA"], refunded: ["bad", "REFUND"] };
  return pageHead("Akun", esc(ME.email)) +
  `<main class="wrap">${backHome}
    <section class="sgrid">
      <div class="sbox"><span class="eyebrow">Status</span><div class="val" style="font-size:24px">${ME.premium ? "Premium 🍰" : "Gratis"}</div>
        <small>${ME.premium ? (ME.lifetime ? "Aktif selamanya." : `Aktif sampai ${day(ME.premiumUntil)}.`) : `Sisa kuota latihan: ${ME.freeLeft} dari ${CFG.freeQuestions} soal.`}</small>
        ${ME.lifetime ? "" : `<div><button class="btn gold sm" data-act="pay">${ME.premium ? "Perpanjang" : "Upgrade"} ${rp(CFG.price)}</button></div>`}</div>
      <div class="sbox"><span class="eyebrow">Tingkat UPKP</span>
        <div class="seg">${Object.keys(CFG.tingkat).map(k => `<button class="${ME.tk === k ? "on" : ""}" data-act="pickTk" data-v="${k}">Tingkat ${k}</button>`).join("")}</div>
        <small>${CFG.tingkat[ME.tk].ij} → ${CFG.tingkat[ME.tk].gol} (${CFG.tingkat[ME.tk].gr})</small></div>
    </section>
    <section><div class="sec-head"><div><h2>Riwayat pembayaran</h2><p>Kalau status masih "Menunggu" padahal sudah bayar, tekan Cek status.</p></div></div>
      ${(V.orders || []).length ? `<div class="tbl"><table class="hist"><thead><tr><th>Order</th><th>Waktu</th><th>Nominal</th><th>Status</th><th></th></tr></thead><tbody>
      ${V.orders.map(o => `<tr><td class="mono">${esc(o.id)}</td><td>${when(o.created_at)}</td><td class="mono">${rp(o.amount)}</td><td><span class="pill ${(st[o.status] || st.pending)[0]}">${(st[o.status] || st.pending)[1]}</span></td><td>${o.status === "pending" ? `<button class="btn line sm" data-act="checkOrder" data-v="${esc(o.id)}">Cek status</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">Belum ada pembayaran.</p>`}</section>
    <section><div class="sec-head"><div><h2>Ganti password</h2></div></div>
      <form class="inline-form" id="pwForm"><input type="password" name="old" placeholder="Password lama" autocomplete="current-password" required><input type="password" name="password" placeholder="Password baru (min. 8)" autocomplete="new-password" minlength="8" required><button class="btn sm" type="submit">Simpan</button></form></section>
    <div class="actions"><button class="btn line" data-act="logout">Keluar dari akun</button></div>
    ${footer()}</main>`;
}
function openPaywall(kind) { modal = kind === "quota" ? "quota" : "pay"; render(); }
function loadSnap() {
  return new Promise((res, rej) => {
    if (window.snap) return res(window.snap);
    if (!CFG.clientKey) return rej(new Error("Pembayaran belum dikonfigurasi admin (MIDTRANS_CLIENT_KEY kosong)."));
    const s = document.createElement("script"); s.src = CFG.snapJs; s.setAttribute("data-client-key", CFG.clientKey);
    s.onload = () => res(window.snap); s.onerror = () => rej(new Error("Gagal memuat halaman pembayaran Midtrans. Cek koneksi lalu coba lagi."));
    document.head.appendChild(s);
  });
}
async function pay() {
  if (V.paying) return; V.paying = true; modal = null; render(); toast("Menyiapkan pembayaran…");
  try {
    const [o, snap] = await Promise.all([api("/pay/create", { body: {} }), loadSnap()]);
    ls.set("cw_order", o.orderId);
    snap.pay(o.token, {
      onSuccess: () => pollOrder(o.orderId), onPending: () => { toast("Pembayaran tercatat. Selesaikan sesuai instruksi, status diperbarui otomatis."); pollOrder(o.orderId); },
      onError: () => toast("Pembayaran gagal. Silakan coba lagi."), onClose: () => toast("Pembayaran belum selesai."),
    });
  } catch (e) { fail(e); } finally { V.paying = false; }
}
async function pollOrder(id, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await api(`/pay/check?order_id=${encodeURIComponent(id)}`);
      if (r.status === "paid") { ME = r.me; ls.set("cw_order", null); route(); if (window.FX) FX.doa(); else toast("Pembayaran berhasil. Premium aktif! 🍰"); return true; }
      if (["failed", "expired"].includes(r.status)) { ls.set("cw_order", null); toast("Pembayaran gagal atau kedaluwarsa."); return false; }
    } catch {}
    await new Promise(r => setTimeout(r, 3000));
  }
  return false;
}
function checkPendingOrder() { const id = ls.get("cw_order"); if (id && !ME.premium) pollOrder(id, 5); }

/* ---------- admin ---------- */
function vAdmin() {
  const s = V.stats, prem = u => u.premium_until && u.premium_until > Date.now();
  return pageHead("Panel admin", "Kelola pengguna, akses Premium, dan pantau pembayaran.") +
  `<main class="wrap">${backHome}
    <div class="stats"><div class="stat"><b>${s.users}</b><small>Pengguna</small></div><div class="stat"><b>${s.premium}</b><small>Premium aktif</small></div><div class="stat"><b>${rp(s.revenue)}</b><small>Total lunas</small></div><div class="stat"><b>${s.orders.filter(o => o.status === "pending").length}</b><small>Order menunggu</small></div></div>
    <section><div class="sec-head"><div><h2>Pengguna</h2><p>Reset password: ketik password baru (min. 8 karakter) lalu tekan Reset, lalu kirimkan ke pengguna.</p></div>
      <form class="inline-form" id="admSearch"><input name="q" placeholder="Cari email atau nama" value="${esc(V.q)}"><button class="btn sm">Cari</button></form></div>
      <div class="tbl"><table class="hist"><thead><tr><th>Pengguna</th><th>Tingkat</th><th>Status</th><th>Kuota dipakai</th><th>Aksi</th></tr></thead><tbody>
      ${V.users.map(u => `<tr><td><b>${esc(u.name)}</b><br><small class="mono">${esc(u.email)}</small></td><td>${u.tk || "–"}</td>
        <td>${prem(u) ? `<span class="pill ok">PREMIUM</span><br><small>${u.premium_until > 3e13 ? "selamanya" : "s.d. " + day(u.premium_until)}</small>` : `<span class="pill mid">GRATIS</span>`}</td><td class="mono">${u.free_used}</td>
        <td><div class="inline-form"><button class="btn line sm" data-act="admPrem" data-v="${u.id}:30">+30 hari</button><button class="btn line sm" data-act="admPrem" data-v="${u.id}:365">+1 tahun</button><button class="btn line sm" data-act="admPrem" data-v="${u.id}:lifetime">Selamanya</button>${prem(u) ? `<button class="btn line sm" data-act="admPrem" data-v="${u.id}:revoke">Cabut</button>` : ""}</div>
          <div class="inline-form" style="margin-top:6px"><input id="pw-${u.id}" type="text" placeholder="Password baru" style="width:150px"><button class="btn line sm" data-act="admPw" data-v="${u.id}">Reset</button></div></td></tr>`).join("") || `<tr><td colspan="5">Tidak ada pengguna.</td></tr>`}</tbody></table></div></section>
    <section><div class="sec-head"><div><h2>Pembayaran terbaru</h2></div></div>
      <div class="tbl"><table class="hist"><thead><tr><th>Order</th><th>Email</th><th>Nominal</th><th>Metode</th><th>Status</th><th>Waktu</th></tr></thead><tbody>
      ${s.orders.map(o => `<tr><td class="mono">${esc(o.id)}</td><td>${esc(o.email)}</td><td class="mono">${rp(o.amount)}</td><td>${esc(o.payment_type || "–")}</td><td>${esc(o.status)}</td><td>${when(o.created_at)}</td></tr>`).join("") || `<tr><td colspan="6">Belum ada pembayaran.</td></tr>`}</tbody></table></div></section>
    ${footer()}</main>`;
}

/* ---------- modal ---------- */
function vModal() {
  if (!modal) return "";
  if (modal === "pay" || modal === "quota") {
    return `<div class="scrim" role="dialog" aria-modal="true"><div class="modal"><span class="eyebrow" style="color:var(--gold)">UPKP Cakewalk Premium</span>
      <h3>${modal === "quota" ? `Kuota ${CFG.freeQuestions} soal gratis sudah habis` : "Fitur ini khusus Premium"}</h3>
      <p>Buka semua materi, latihan tanpa batas, Tryout Mini, Simulasi CAT, pembahasan setiap soal, dan Progress.</p>
      <div class="price">${rp(CFG.price)}<small>akses ${durasi(CFG.premiumDays)} · bayar lewat Midtrans (QRIS, VA, e-wallet, kartu)</small></div>
      <div class="actions" style="justify-content:flex-end"><button class="btn line" data-act="mNo">Nanti dulu</button><button class="btn gold" data-act="pay">Bayar sekarang</button></div></div></div>`;
  }
  let h = "", p = "", yes = "";
  if (modal === "finish") {
    const s = sess.secs[sess.si], un = s.ans.filter(a => a < 0).length, fl = s.flag.filter(Boolean).length;
    h = `Selesaikan sesi ${sess.si + 1}?`; p = `${un ? `<b>${un} soal belum dijawab.</b> ` : "Semua soal sudah dijawab. "}${fl ? `${fl} soal masih ditandai ragu-ragu. ` : ""}Setelah sesi selesai, jawaban tidak bisa diubah.`; yes = "Ya, selesaikan";
  } else if (modal === "quit") { h = "Keluar dari latihan?"; p = sess?.kind === "prac" ? "Soal yang sudah dijawab tetap terhitung." : "Jawaban di sesi ini tidak akan disimpan."; yes = "Keluar"; }
  else if (modal === "retrySubmit") { h = "Jawaban belum terkirim"; p = "Koneksi bermasalah. Jawaban kamu masih tersimpan di halaman ini."; yes = "Kirim lagi"; }
  return `<div class="scrim" role="dialog" aria-modal="true"><div class="modal"><h3>${h}</h3><p>${p}</p>
    <div class="actions" style="justify-content:flex-end">${modal === "retrySubmit" ? "" : `<button class="btn line" data-act="mNo">Batal</button>`}<button class="btn ${modal === "finish" ? "gold" : ""}" data-act="mYes" id="myes">${yes}</button></div></div></div>`;
}

/* ---------- render & event ---------- */
function render() {
  const f = { auth: vAuth, home: vHome, materi: vMateri, read: vRead, tips: vTips, latihan: vLatihan, progress: vProgress, akun: vAkun, admin: vAdmin, prac: vPrac, presult: vPResult, cat: vCat, break: vBreak, cresult: vCResult }[V.view];
  if (!f) return;
  app.innerHTML = f() + vModal();
  if (window.FX) FX.view(V.view, !!(ME && ME.premium));
}
const H = {
  drawer: v => openDrawer(v), jump: id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); },
  pickTk: async v => {
    try {
      const first = !ME.tk; ME = await api("/me", { method: "PATCH", body: { tk: v } }); toast(`Tingkat ${v} dipilih.`);
      if (V.view === "home") { render(); if (first) document.getElementById("layers")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
      else if (V.view === "latihan") render(); else if (V.view === "akun") render(); else nav("home");
    } catch (e) { fail(e); }
  },
  preTk: v => { V.preTk = v; const y = scrollY; render(); scrollTo(0, y); toast(`Tingkat ${v} dipilih. Klik Daftar kalau sudah siap mulai.`); },
  plan: v => { V.wantPremium = v === "premium"; openDrawer("daftar"); },
  paywall: () => openPaywall("premium"), pay: () => pay(),
  openPage: v => nav("materi/" + v),
  start: (v, b) => startStage(+v, b.dataset.cat),
  retry: () => startStage(sess.mode, sess.cat),
  leave: () => { sess = null; },
  pans: v => answer(+v),
  pnext: () => { const s = sess; if (s.i + 1 >= s.qs.length) return finishPrac(); s.i++; s.qEnd = Date.now() + s.per * 1000; render(); },
  csel: v => { const s = sess.secs[sess.si]; s.ans[s.cur] = +v; render(); },
  cprev: () => { const s = sess.secs[sess.si]; if (s.cur > 0) { s.cur--; render(); } },
  cnext: () => { const s = sess.secs[sess.si]; if (s.cur < s.qs.length - 1) { s.cur++; render(); } },
  cjump: v => { sess.secs[sess.si].cur = +v; render(); },
  cflag: () => { const s = sess.secs[sess.si]; s.flag[s.cur] = !s.flag[s.cur]; render(); },
  startSec: () => { const s = sess.secs[sess.si]; s.end = Date.now() + s.dur * 1000; go("cat"); },
  filter: v => { V.filter = v; const y = window.scrollY; render(); window.scrollTo(0, y); },
  askFinish: () => { modal = "finish"; render(); }, askQuit: () => { modal = "quit"; render(); },
  mNo: () => { modal = null; render(); },
  mYes: async () => {
    const m = modal; modal = null;
    if (m === "finish" || m === "retrySubmit") return endSection();
    if (m === "quit") { const wasPrac = sess?.kind === "prac" && sess.fb.some(Boolean); if (wasPrac) await api(`/practice/${sess.id}/finish`, { body: {} }).catch(() => {}); sess = null; V.view = "latihan"; nav("latihan"); }
  },
  checkOrder: async v => { toast("Mengecek status…"); const ok = await pollOrder(v, 1); if (!ok) { toast("Belum lunas. Kalau sudah bayar, tunggu 1–2 menit lalu cek lagi."); route(); } },
  logout: async () => { await api("/auth/logout", { body: {} }).catch(() => {}); ME = null; sess = null; location.hash = ""; go("auth"); },
  admPrem: async v => { const [id, a] = v.split(":"); try { await api(`/admin/users/${id}/premium`, { body: a === "lifetime" || a === "revoke" ? { action: a } : { action: "grant", days: +a } }); toast("Akses diperbarui."); V.users = await api("/admin/users?q=" + encodeURIComponent(V.q)); V.stats = await api("/admin/stats"); render(); } catch (e) { fail(e); } },
  admPw: async v => { const pw = document.getElementById("pw-" + v).value; try { await api(`/admin/users/${v}/password`, { body: { password: pw } }); toast("Password direset. Kirimkan password baru ke pengguna."); document.getElementById("pw-" + v).value = ""; } catch (e) { fail(e); } },
};
app.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  if (b.tagName !== "A") e.preventDefault();
  H[b.dataset.act]?.(b.dataset.v, b);
});
app.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "authForm") return submitAuth(e.target);
  if (e.target.id === "pwForm") { const fd = Object.fromEntries(new FormData(e.target)); try { await api("/me/password", { body: fd }); toast("Password diganti."); e.target.reset(); } catch (er) { toast(er.message); } }
  if (e.target.id === "admSearch") { V.q = new FormData(e.target).get("q"); try { V.users = await api("/admin/users?q=" + encodeURIComponent(V.q)); render(); } catch (er) { fail(er); } }
});
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (modal) { if (e.key === "Escape" && modal !== "retrySubmit") H.mNo(); return; }
  const k = e.key.toLowerCase(), idx = "abcde".includes(k) && k.length === 1 ? "abcde".indexOf(k) : "12345".includes(k) && k.length === 1 ? "12345".indexOf(k) : -1;
  if (V.view === "prac") { if (idx >= 0 && !sess.fb[sess.i]) answer(idx); else if (e.key === "Enter" && sess.fb[sess.i] && e.target.id !== "pnext") H.pnext(); }
  if (V.view === "cat") { if (idx >= 0) H.csel(idx); else if (e.key === "ArrowRight") H.cnext(); else if (e.key === "ArrowLeft") H.cprev(); else if (k === "r") H.cflag(); }
});
setInterval(() => {
  if (!sess) return;
  if (V.view === "cat") {
    const s = sess.secs[sess.si], left = Math.max(0, Math.ceil((s.end - Date.now()) / 1000)), el = document.getElementById("clock");
    if (el) { el.textContent = mmss(left); el.classList.toggle("low", left <= 300); }
    if (left <= 0 && !modal) endSection();
  } else if (V.view === "prac" && sess.per && !sess.fb[sess.i] && !sess.busy) {
    const left = Math.max(0, Math.ceil((sess.qEnd - Date.now()) / 1000)), el = document.getElementById("qt");
    if (el) { el.textContent = mmss(left); el.classList.toggle("low", left <= 15); }
    if (left <= 0) answer(-1);
  }
}, 250);
window.addEventListener("beforeunload", e => { if (["cat", "break"].includes(V.view)) { e.preventDefault(); e.returnValue = ""; } });

/* tandai bagian yang sedang dilihat di menu cepat */
let spyT = 0;
window.addEventListener("scroll", () => {
  if (spyT) return; spyT = requestAnimationFrame(() => {
    spyT = 0; const btns = document.querySelectorAll(".snrow.sub button[data-v]"); if (!btns.length) return;
    let cur = null; btns.forEach(b => { const el = document.getElementById(b.dataset.v); if (el && el.getBoundingClientRect().top <= 140) cur = b; });
    btns.forEach(b => b.classList.toggle("on", b === cur));
  });
}, { passive: true });

/* ---------- mulai ---------- */
(async () => {
  try { CFG = await api("/config"); } catch { app.innerHTML = `<p style="padding:40px;text-align:center">Server tidak dapat dihubungi. Muat ulang halaman.</p>`; return; }
  try { ME = await api("/me"); } catch { ME = null; }
  route();
})();
