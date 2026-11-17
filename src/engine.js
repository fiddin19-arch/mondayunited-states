/* Mondayunited States — mesin permainan (aturan v1.9)
 * Murni JavaScript, tanpa DOM. Dipakai oleh server Node (jalur B) dan oleh
 * perangkat pembuat room di versi link Claude (jalur A).
 * State G sepenuhnya JSON-serializable sehingga bisa disimpan & dilanjutkan.
 */
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ DATA
  const PERSONAS = [
    { id: 'prof', e: '🎓', n: 'Profesor', t: 'Sudah diteliti, belum dibaca.' },
    { id: 'emak', e: '🛵', n: 'Emak-emak', t: 'Sein kiri, belok kanan.' },
    { id: 'ojol', e: '🧥', n: 'Driver Ojol', t: 'Bintang lima, gaji satu.' },
    { id: 'mhs', e: '📢', n: 'Mahasiswa', t: 'Semester 14, idealisme 100.' },
    { id: 'rt', e: '📋', n: 'Pak RT', t: 'Fotokopi KTP dua lembar.' },
    { id: 'seleb', e: '🤳', n: 'Selebgram', t: 'Endorse dulu, klarifikasi nanti.' },
    { id: 'pns', e: '🗂️', n: 'ASN Teladan', t: 'Datang 07.30, pulang absen.' },
    { id: 'dukun', e: '🔮', n: 'Konsultan Spiritual', t: 'Prediksi pemilu 100% (setelah hasil).' },
    { id: 'satpam', e: '🔦', n: 'Satpam Kompleks', t: 'Portal ditutup jam 10.' },
    { id: 'kades', e: '🧑‍🌾', n: 'Pak Kades', t: 'Dana desa aman, katanya.' },
    { id: 'grup', e: '📲', n: 'Admin Grup Keluarga', t: 'Forward dari grup sebelah.' },
    { id: 'wartawan', e: '🎙️', n: 'Wartawan Lepas', t: 'Narasumber: sumber terpercaya.' },
  ];
  const BOT_NAMES = ['Budi', 'Sri', 'Joko', 'Ani', 'Rudi', 'Mega', 'Tono', 'Ucup', 'Wati', 'Dedi', 'Lina', 'Asep'];
  const DARK_ROLES = ['KORUPTOR', 'BROKER', 'BUZZER'];
  const ROLES = {
    KORUPTOR: { icon: '🐀', title: 'Koruptor', fac: 'GELAP', desc: 'Anda tidak korupsi, Anda <i>mengoptimalkan anggaran</i>. Setiap malam tulis satu berita fiktif: BERITA JELEK (fitnah satu warga jadi Tersangka) atau BERITA BAGUS (pencitraan yang menggagalkan OTT KPK pada satu orang, termasuk sekutu Anda).', action: 'Tulis Berita Fiktif' },
    BROKER: { icon: '🤝', title: 'Broker', fac: 'GELAP', desc: 'Penghubung antara yang butuh dan yang punya. Komisi 10% sudah termasuk pajak. Sekali per game, rekrut satu Warga Sipil menjadi Buzzer.', action: 'Gunakan Hak Rekrut Broker (1x)' },
    BUZZER: { icon: '📣', title: 'Buzzer', fac: 'GELAP', desc: 'Satu akun, seribu suara. Bayarannya nasi kotak. Setiap malam, balikkan suara satu pemain untuk esok hari.', action: 'Balikkan Suara Target' },
    KPK: { icon: '🕵️', title: 'Penyidik KPK', fac: 'REFORMIS', desc: 'Gaji UMR, tanggung jawab negara. Setiap malam pilih satu: SADAP (Anda tahu faksi target) atau OTT (target jadi Tersangka besok, siapa pun dia). Berkas OTT tampil sama persis dengan berita tuduhan Koruptor, jadi sadap dulu sebelum OTT supaya tidak salah sasaran.', action: 'Sadap atau OTT' },
    JURNALIS: { icon: '🎙️', title: 'Jurnalis Investigasi', fac: 'REFORMIS', desc: 'Deadline jam 5, klarifikasi jam 5 lewat 1. Setiap malam, cek fakta satu pemain: berita Koruptor tentang dia (jelek maupun bagus) dibatalkan. Kalau yang dibatalkan berita bagus, hanya Anda yang tahu bahwa ia dapat pencitraan Koruptor. Kalau dijebloskan Presiden, Anda dapat Hak Headline.', action: 'Cek Fakta Satu Pemain' },
    PENGAMAT: { icon: '📊', title: 'Pengamat Politik', fac: 'REFORMIS', desc: 'Analisis saya selalu tepat, setelah kejadian. Setiap malam, amati satu pemain dan ketahui siapa yang ia datangi.', action: 'Amati Pergerakan Satu Pemain' },
    GURU_BESAR: { icon: '🧑‍🏫', title: 'Guru Besar', fac: 'REFORMIS', desc: 'Menurut kajian saya (halaman 3 dari 400)… Sekali per game saat Sidang, serahkan Kesaksian Ahli: Presiden tahu faksi asli Tersangka.', action: 'Kesaksian Ahli ke Presiden (1x, siang)' },
    WARGA: { icon: '🧍', title: 'Warga Sipil', fac: 'REFORMIS', desc: 'Tidak punya kuasa, hanya punya kuota. Senjata Anda: debat di Sidang, coblosan, dan petisi.', action: null },
  };
  const WIN_TEXT = {
    GELAP: 'Menang jika semua Reformis dipenjara, Koruptor terpilih Presiden 3 kali, atau hari ke-20 lewat.',
    REFORMIS: 'Menang jika semua Koruptor, Broker, dan Buzzer mendekam di penjara sebelum hari ke-20.',
  };
  const DIST_KEYS = ['KORUPTOR', 'BROKER', 'BUZZER', 'KPK', 'JURNALIS', 'PENGAMAT', 'GURU_BESAR'];
  const NINE_PLUS = ['PENGAMAT', 'GURU_BESAR'];
  const DIST = {
    6: [1, 1, 0, 1, 1, 0, 0], 7: [1, 1, 1, 1, 1, 0, 0], 8: [1, 1, 1, 1, 1, 0, 0],
    9: [2, 1, 1, 1, 1, 1, 1], 10: [2, 1, 1, 1, 1, 1, 1], 11: [2, 1, 1, 1, 1, 1, 1], 12: [2, 2, 1, 1, 1, 1, 1],
  };
  const CARDS = [
    { id: 'joki', title: 'Joki Skripsi Jalur Ordal', h: '{t} ketahuan joki skripsi 40 mahasiswa, auto lulus cumlaude!' },
    { id: 'pinjol', title: 'Pinjol Pakai KTP Warga', h: '{t} ajukan pinjol pakai KTP sekampung, limit langsung cair!' },
    { id: 'judol', title: 'Beking Situs Judol', h: '{t} diduga beking judol, slot gacor disebut "investasi digital"!' },
    { id: 'flexing', title: 'Flexing Tas Branded Keluarga', h: 'Istri {t} flexing tas 1 M, netizen langsung spill LHKPN!' },
    { id: 'mobil', title: 'Mobil Mewah Anak Pejabat', h: 'Anak {t} pamer mobil mewah, platnya ternyata pelat dinas!' },
    { id: 'ijazah', title: 'Ijazah Editan Canva', h: 'Ijazah {t} ternyata editan Canva, fontnya Comic Sans!' },
    { id: 'laptop', title: 'Mark-up Laptop Sekolah', h: 'Laptop sekolah 3 juta dibeli {t} 30 juta, speknya kentang!' },
    { id: 'bbm', title: 'BBM Oplosan', h: '{t} oplos BBM, pertamax rasa pertalite, motor warga auto batuk!' },
    { id: 'beras', title: 'Beras Premium Oplosan', h: 'Beras premium {t} ternyata oplosan, yang wangi cuma labelnya!' },
    { id: 'laut', title: 'Sertifikat Tanah di Tengah Laut', h: '{t} punya sertifikat tanah di tengah laut, ikan pun kena gusur!' },
    { id: 'tunjangan', title: 'Tunjangan Kos 50 Juta', h: '{t} terima tunjangan kos 50 juta per bulan, kosnya di Bali!' },
    { id: 'joget', title: 'Joget Pas Rakyat Demo', h: '{t} joget di ruang sidang saat rakyat demo, empatinya lagi healing!' },
    { id: 'haji', title: 'Kuota Haji Jalur VIP', h: '{t} jual kuota haji jalur VIP, antrean 40 tahun di-skip!' },
    { id: 'cpns', title: 'Titip Ponakan di CPNS', h: '{t} titip 7 ponakan lolos CPNS, semua ranking 1 dari belakang!' },
    { id: 'mbg', title: 'Vendor Makan Gratis Fiktif', h: 'Vendor makan gratis milik {t} ternyata alamatnya warung kopi!' },
    { id: 'bansos', title: 'Bansos Jadi Konten', h: '{t} bagi bansos sambil live, dapur warga jadi studio konten!' },
    { id: 'koin', title: 'Koin Kripto Pejabat', h: '{t} rilis koin meme, pump seminggu, dump selamanya!' },
    { id: 'buzzer', title: 'Buzzer Dibayar APBD', h: '{t} bayar buzzer pakai APBD, nasi kotak masuk SPJ!' },
    { id: 'tol', title: 'Proyek Tol Siluman', h: '{t} resmikan tol yang cuma ada di PowerPoint!' },
    { id: 'sawit', title: 'Kebun Sawit di Hutan Lindung', h: '{t} punya kebun sawit di hutan lindung, orangutan auto ngontrak!' },
  ];
  const VISI = ['Wifi Gratis Seumur Hidup', 'Hapus Hari Senin', 'Makan Siang Gratis untuk Pejabat', 'Lima Hari Libur Seminggu', 'Bansos Langsung ke Dompet Digital', 'Macet Dijadikan Wisata', 'Tol Gratis Tiap Lebaran', 'Kuota Internet Unlimited Nasional'];
  const SIDANG_LINES = [
    '{s} kok diam aja dari tadi? 🤔', 'FITNAH! Saya cuma beli NFT kucing satu biji.', 'Presiden {p} harus tegas, jangan masuk angin!',
    'Saya curiga sama yang paling rajin ngomong integritas.', 'Ini mah pengalihan isu, harga cabai naik nih.', 'Coba cek siapa yang semalam online jam 2 pagi 😏',
    'Tolong {p}, rakyat butuh kepastian hukum.', 'Kalau saya Koruptor, saya nggak akan sebodoh itu.', 'Petisi sudah saya share di grup keluarga.',
    'Saya netral. Netral condong ke kanan sedikit.', '{s} spill dong asal-usul mobil mewahnya.', 'Jangan buru-buru, nanti salah tangkap lagi kayak kemarin.',
    'No debat, {s} red flag banget.', 'Yang bela {s} mati-matian justru mencurigakan.', 'Saya mah ikut keputusan Presiden aja, asal ada nasi kotaknya.',
  ];
  const ELECTION_LINES = ['Pilih saya, Senin saya hapus!', 'Visi saya jelas: wifi kencang, rakyat senang.', 'Jangan golput ya, gais.', 'Saya sih pilih yang mukanya paling jujur.', 'Serangan fajar belum datang nih 😅'];
  const DARK_LINES = ['Target malam ini yang paling berisik aja.', 'Jangan si {p}, dia imun.', 'Kartu ijazah biasanya laku.', 'Aman, Jurnalis kayaknya lagi cek fakta orang lain.', 'Siap, saya ikut saja. Komisi biasa ya.'];
  const APPEAL_LINES = ['Saya hanya disuruh, Pak.', 'Saya siap jadi justice collaborator.', 'Saya punya anak istri dan cicilan.', 'Ini kriminalisasi!'];
  const LETTER_LINES = ['Saya dijebak! Cek lagi berkasnya.', 'Yang teriak paling keras itu justru pelakunya.', 'Tolong sampaikan ke keluarga, saya baik-baik saja.'];
  const COLUMN_LINES = ['Saya dipenjara karena menulis. Yang korupsi masih rapat di hotel.', 'Berita ini ditulis dengan pensil pinjaman sipir. Cek lagi Keppres-nya.', 'Yang menjebloskan saya lebih takut fakta daripada hoaks.'];

  const FIXED_T = { reveal: 60, election: 45, morning: 9, decision: 30 };
  const MAX_DAYS = 20;
  // Aturan yang bisa diubah per room (untuk penyeimbangan). Default = aturan standar.
  const DEFAULT_RULES = { maxDays: 20, fitnahCooldown: false, impeachFrac: 0.5, darkTerms: 3, grasi: false, kpkDual: false };
  const R = (G, k) => (G.settings && G.settings.rules && G.settings.rules[k] != null ? G.settings.rules[k] : DEFAULT_RULES[k]);
  const MIN_PLAYERS = 6, MAX_PLAYERS = 12;

  // --------------------------------------------------------------- HELPERS
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const P = (G, id) => G.players.find((p) => p.id === id);
  const isDark = (p) => !!p && DARK_ROLES.includes(p.role);
  const free = (G) => G.players.filter((p) => !p.jailed);
  const pres = (G) => (G.presidentId != null ? P(G, G.presidentId) : null);
  const card = (id) => CARDS.find((c) => c.id === id);
  const persona = (id) => PERSONAS.find((x) => x.id === id) || PERSONAS[0];
  const pad2 = (n) => String(n).padStart(2, '0');
  const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  const ai = (p) => !!(p.bot || p.auto);           // dikendalikan mesin (bot atau autopilot AFK)
  const active = (p) => ai(p) || p.connected;      // pemain yang ditunggu
  const LOBBY_CD = 60000, LOBBY_EXT_MAX = 5, BOT_OFFER_MS = 180000, GHOST_MS = 90000, HOST_GRACE_MS = 15000, AFK_MS = 120000;
  // Filter kata kasar sederhana (huruf boleh diulang: "anjiiing")
  const BAD = ['anjing', 'anjeng', 'anjir', 'bangsat', 'bajingan', 'babi', 'kontol', 'memek', 'ngentot', 'entot', 'jancok', 'jancuk', 'cok', 'asu', 'goblok', 'goblog', 'tolol', 'kampret', 'keparat', 'pepek', 'peler', 'titit', 'puki', 'lonte', 'pelacur', 'perek', 'tai', 'taik', 'bego', 'idiot', 'fuck', 'shit', 'bitch'];
  const BAD_RE = new RegExp('(^|[^a-z])(' + BAD.map((w) => w.split('').map((c) => c + '+').join('')).join('|') + ')(?=$|[^a-z])', 'gi');
  const filt = (t) => String(t).replace(BAD_RE, (m, pre, w) => pre + w[0] + '*'.repeat(Math.max(2, w.length - 1)));

  const openCases = (G) => G.cases.filter((c) => !c.vetoed && !c.closed && P(G, c.suspect) && !P(G, c.suspect).jailed);
  const caseSuspects = (G) => openCases(G).map((c) => c.suspect);
  // Pelaksana tugas: jika semua Koruptor dipenjara, Broker/Buzzer yang bebas mengambil alih kartu skandal
  const scandalActors = (G) => free(G).filter((p) => p.role === 'KORUPTOR'); // tanpa Plt.: jika semua Koruptor dipenjara, sisa Faksi Gelap hanya bisa mengulur waktu
  function stat(G, id, k) { G.stats[id] = G.stats[id] || {}; G.stats[id][k] = (G.stats[id][k] || 0) + 1; }
  function sys(G, text) { G.chat.push({ id: ++G.seq, sys: true, text }); trimChat(G); }
  function say(G, from, text, extra) { G.chat.push(Object.assign({ id: ++G.seq, from, text }, extra || {})); trimChat(G); }
  function trimChat(G) { if (G.chat.length > 70) G.chat.splice(0, G.chat.length - 70); }
  function note(G, pid, text, tone) { (G.notes[pid] = G.notes[pid] || []).push({ id: ++G.seq, text, tone: tone || 'zinc' }); if (G.notes[pid].length > 12) G.notes[pid].shift(); }
  function fx(G, type, title, sub, dur, now) { G.fx = { id: ++G.seq, type, title, sub, at: now, dur }; }
  function setPhase(G, ph, secs, now) { G.phase = ph; G.phaseStart = now; G.phaseDur = secs || 0; G.endsAt = secs ? now + secs * 1000 : 0; scheduleBots(G, now, 1500, 6000); }
  function later(G, step, ms, now, arg) { G.pending = { at: now + ms, step, arg: arg == null ? null : arg }; }

  // ---------------------------------------------------------------- CREATE
  function create(code, creatorId, now, opts) {
    now = now || Date.now(); opts = opts || {};
    return {
      v: 3, code: String(code), creatorId, phase: 'LOBBY', phaseStart: now, phaseDur: 0, endsAt: 0, pending: null, rev: 1, seq: 0,
      settings: { auto: true, dist: DIST[8].slice(), timers: { night: 45, sidang: 180 }, scandalTarget: 5, rules: {}, public: !!opts.public },
      lobby: { cdAt: 0, ext: 0, openedAt: now }, banned: {},
      players: [], day: 0, scandal: 0, presidentId: null, term: { n: 0, round: 1 }, darkTerms: 0, vetoAvailable: true,
      cases: [], sigs: {}, skip: {}, flipTarget: null, lastProtected: {}, recruitUsed: false, deck: [], hand: [], korChoice: null,
      nightActs: {}, investigations: {}, observations: {}, pendingColumn: null, expertUsed: false, expertReport: null,
      election: null, chat: [], dark: [], appeals: [], notes: {}, news: null, fx: null, history: [], stats: {},
      decided: false, carryover: false, pendingDecision: false, winner: null, reason: '', botAt: {}, createdAt: now, updatedAt: now,
    };
  }

  // ----------------------------------------------------------------- LOBBY
  function join(G, pid, info, now) {
    now = now || Date.now();
    const ex = P(G, pid);
    if (ex) { ex.connected = true; if (G.phase === 'LOBBY' && info) { if (info.name) ex.name = uniqueName(G, filt(clean(info.name, 14)) || ex.name, pid); if (info.persona) setPersona(G, ex, info.persona); } bump(G, now); return { ok: true }; }
    if (G.banned && G.banned[pid]) return { err: 'Anda sudah dikeluarkan dari room ini oleh pemegang palu.' };
    if (G.phase !== 'LOBBY') return { err: 'Sidang sudah berjalan. Tunggu ronde berikutnya.' };
    if (G.players.length >= MAX_PLAYERS) return { err: 'Ruang sidang penuh (12 kursi).' };
    const p = blankPlayer(pid, uniqueName(G, filt(clean(info && info.name, 14)) || 'Warga', pid), null, false);
    G.players.push(p); setPersona(G, p, info && info.persona);
    if (!G.creatorId || !P(G, G.creatorId)) G.creatorId = pid;
    sys(G, `📝 ${p.name} hadir di ruang sidang.`);
    bump(G, now); return { ok: true };
  }
  function blankPlayer(id, name, persona, bot) {
    return { id, name, persona, bot: !!bot, connected: true, role: null, jailed: false, jailedDay: 0, suspect: false, impeached: false, appealUsed: false, headlineRight: false, recruited: false, ready: false, letterDay: 0, lastChatAt: 0 };
  }
  function uniqueName(G, name, pid) {
    let n = name, i = 2; while (G.players.some((p) => p.id !== pid && p.name.toLowerCase() === n.toLowerCase())) n = `${name} (${i++})`; return n;
  }
  function setPersona(G, p, want) {
    const taken = new Set(G.players.filter((x) => x.id !== p.id).map((x) => x.persona));
    if (want && PERSONAS.some((x) => x.id === want) && !taken.has(want)) p.persona = want;
    else if (!p.persona || taken.has(p.persona)) p.persona = (PERSONAS.find((x) => !taken.has(x.id)) || PERSONAS[0]).id;
  }
  function addBot(G) {
    if (G.players.length >= MAX_PLAYERS) return { err: 'Ruang sidang penuh.' };
    const name = BOT_NAMES.find((n) => !G.players.some((p) => p.name === n)) || 'Bot' + G.players.length;
    const p = blankPlayer('bot_' + (++G.seq) + '_' + Math.random().toString(36).slice(2, 6), name, null, true);
    G.players.push(p); setPersona(G, p, null); return { ok: true };
  }
  function distCounts(G) {
    const n = G.players.length, d = G.settings.auto ? (DIST[Math.min(12, Math.max(6, n))] || DIST[6]).slice() : G.settings.dist.slice();
    const dark = d[0] + d[1] + d[2], warga = n - d.reduce((a, b) => a + b, 0), lockOk = n >= 9 || (d[5] === 0 && d[6] === 0);
    return { d, n, dark, ref: n - dark, warga, valid: n >= MIN_PLAYERS && n <= MAX_PLAYERS && warga >= 0 && dark < n - dark && d[0] >= 1 && lockOk };
  }
  function startGame(G, now) {
    const dc = distCounts(G);
    if (G.players.length < MIN_PLAYERS) return { err: `Minimal ${MIN_PLAYERS} pemain. Tambahkan bot jika kurang.` };
    if (!dc.valid) return { err: 'Komposisi role tidak valid untuk jumlah pemain ini.' };
    const pool = []; DIST_KEYS.forEach((k, i) => { for (let j = 0; j < dc.d[i]; j++) pool.push(k); }); for (let j = 0; j < dc.warga; j++) pool.push('WARGA');
    shuffle(pool).forEach((r, i) => Object.assign(G.players[i], { role: r, jailed: false, jailedDay: 0, suspect: false, impeached: false, appealUsed: false, headlineRight: false, recruited: false, ready: false, letterDay: 0, exNapi: false, impeachCount: 0, banUntil: 0 }));
    Object.assign(G, { sadapNight: {}, lastBadDay: -9, grasiUsed: false, day: 0, scandal: 0, presidentId: null, term: { n: 0, round: 1 }, darkTerms: 0, vetoAvailable: true, cases: [], sigs: {}, skip: {}, flipTarget: null, lastProtected: {}, recruitUsed: false, deck: [], hand: [], korChoice: null, nightActs: {}, investigations: {}, observations: {}, pendingColumn: null, expertUsed: false, expertReport: null, election: null, dark: [], appeals: [], notes: {}, news: null, fx: null, history: [], stats: {}, decided: false, carryover: false, pendingDecision: false, winner: null, reason: '', pending: null });
    G.lobby = Object.assign(G.lobby || {}, { cdAt: 0 });
    G.chat = []; sys(G, '🏛️ Sidang dimulai. Buka amplop rahasia Anda.');
    setPhase(G, 'REVEAL', FIXED_T.reveal, now);
    return { ok: true };
  }

  // -------------------------------------------------------------- ELECTION
  function startElection(G, reason, now) {
    const sus = G.pendingDecision ? caseSuspects(G) : [];
    // Rehabilitasi politik: cacat politik hanya berlaku satu masa jabatan
    G.players.forEach((p) => { if (p.impeached && p.banUntil !== Infinity && G.term.n >= (p.banUntil || 0)) { p.impeached = false; sys(G, `🕊️ ${p.name} direhabilitasi. Hak dipilihnya pulih.`); } });
    const justOut = reason === 'makzul' ? G.lastImpeached : null; // yang baru dimakzulkan tidak ikut pemilu kilat yang sama
    const elig = free(G).filter((p) => !p.impeached && !sus.includes(p.id) && p.id !== justOut);
    G.presidentId = null; G.plt = false;
    if (elig.length < 2) {
      if (elig.length === 1) { install(G, elig[0].id, 'satu-satunya kandidat', now); return; }
      // Plt. Presiden darurat: diundi dari semua pemain bebas, 1 putaran, tanpa Hak Veto
      const pool = free(G).filter((p) => !sus.includes(p.id)); const pick = pool.length ? pool : free(G);
      if (pick.length) { install(G, rnd(pick).id, 'Plt. darurat, diundi karena tidak ada kandidat', now, false, true); return; }
      if (G.pendingDecision) { G.pendingDecision = false; }
      startNight(G, now); return;
    }
    const cands = shuffle(elig).slice(0, 2).map((p) => p.id), v = shuffle(VISI);
    G.election = { cands, votes: {}, reason, visi: { [cands[0]]: v[0], [cands[1]]: v[1] }, done: false };
    setPhase(G, 'ELECTION', FIXED_T.election, now);
  }
  function electionVoters(G) { return G.players.filter((p) => !G.election.cands.includes(p.id)); }
  function maybeFinishElection(G, now) {
    if (G.pending || G.election.done) return;
    if (electionVoters(G).filter(active).every((p) => G.election.votes[p.id] != null)) later(G, 'finishElection', 900, now);
  }
  function finishElection(G, now) {
    const e = G.election; if (!e || e.done) return; e.done = true; G.endsAt = 0;
    const [a, b] = e.cands, t = { [a]: 0, [b]: 0 };
    Object.keys(e.votes).forEach((v) => { let c = e.votes[v]; if (v === G.flipTarget) c = c === a ? b : a; if (t[c] != null) t[c]++; });
    let win, coin = false;
    if (t[a] === t[b]) { win = rnd([a, b]); coin = true; } else win = t[a] > t[b] ? a : b;
    install(G, win, `${t[win]} vs ${t[win === a ? b : a]} suara${coin ? ', diputuskan Mahkamah Koin' : ''}`, now, coin);
  }
  function install(G, win, how, now, coin, plt) {
    const p = P(G, win);
    G.presidentId = win; G.plt = !!plt; G.grasiUsed = false; G.term = { n: G.term.n + 1, round: plt ? 2 : 1 }; G.vetoAvailable = !plt; stat(G, win, 'pres');
    if (p.role === 'KORUPTOR' && !plt) G.darkTerms++;
    sys(G, `👑 ${p.name} dilantik sebagai ${plt ? 'Plt. Presiden' : 'Presiden'} (${how}).`);
    G.history.push(plt ? `Kursi kosong: ${p.name} jadi Plt. Presiden` : `Pemilu: ${p.name} jadi Presiden`);
    fx(G, coin ? 'coin' : 'inaug', coin ? '🪙 Seri! Mahkamah Koin memutuskan' : `👑 ${plt ? 'Plt. ' : ''}${p.name}`, coin ? `${p.name} dilantik sebagai Presiden` : plt ? 'Tidak ada kandidat tersisa. Plt. Presiden diundi untuk 1 putaran, tanpa Hak Veto.' : `Dilantik sebagai Presiden • Periode ${G.term.n}`, 2600, now);
    if (checkWin(G, now)) return;
    later(G, 'afterInstall', 2700, now);
  }

  // ----------------------------------------------------------------- NIGHT
  function dealHand(G) { if (G.deck.length < 5) G.deck = shuffle(CARDS.map((c) => c.id)); return G.deck.slice(0, 5); }
  function startNight(G, now) {
    if (G.day >= R(G, 'maxDays')) { G.winner = 'GELAP'; G.reason = `Hari ke-${R(G, 'maxDays')} lewat tanpa vonis tuntas. Kasus kedaluwarsa, status quo abadi.`; G.pending = null; setPhase(G, 'END', 0, now); return; }
    G.day++; G.cases = [];
    appointPltKpk(G); G.players.forEach((p) => (p.suspect = false)); G.expertReport = null;
    G.hand = dealHand(G); G.korChoice = null; G.nightActs = {}; G.decided = false; G.appeals = [];
    setPhase(G, 'NIGHT', G.settings.timers.night, now);
  }
  // Penyidik pengganti: jika tidak ada KPK yang bebas, satu Warga Sipil bebas diam-diam diangkat jadi KPK
  function appointPltKpk(G) {
    if (G.players.some((p) => p.role === 'KPK' && !p.jailed)) return;
    if (!G.players.some((p) => p.role === 'KPK') && !G.kpkEverJailed) return; // game tanpa KPK sejak awal
    const pool = free(G).filter((p) => p.role === 'WARGA' && p.id !== G.presidentId);
    if (!pool.length) return;
    const p = rnd(pool); p.role = 'KPK'; p.pltKpk = true; G.kpkEverJailed = true;
    G.history.push(`Malam ${G.day}: penyidik pengganti KPK diangkat diam-diam`);
    note(G, p.id, '🕵️ Anda diangkat diam-diam menjadi PENYIDIK KPK pengganti. Mulai malam ini Anda bisa Sadap atau OTT. Cek kartu role Anda.', 'reform');
  }
  function validTarget(G, me, tid, opts) {
    const t = P(G, tid); if (!t || t.jailed) return null;
    if (!opts.self && t.id === me.id) return null;
    if (opts.notDark && isDark(t)) return null;
    if (opts.notPres && t.id === G.presidentId) return null;
    return t;
  }
  // Berita Koruptor: JELEK (fitnah, target non-Dark) atau BAGUS (pencitraan, target siapa pun kecuali Presiden)
  function setKorChoice(G, me, a) {
    const good = !!a.good;
    if (!good && R(G, 'fitnahCooldown') && G.lastBadDay === G.day - 1) return { err: 'Redaksi sedang diawasi: malam ini hanya boleh berita bagus.' };
    const t = validTarget(G, me, a.target, good ? { self: true, notPres: true } : { notDark: true, notPres: true }); if (!t) return { err: 'Target tidak valid.' };
    if (!good && !G.hand.includes(a.card)) return { err: 'Kartu tidak ada di tangan.' };
    G.korChoice = { target: t.id, card: good ? null : a.card, by: me.id, good };
    return null;
  }
  function nightAction(G, me, a, now) {
    if (G.phase !== 'NIGHT' || G.pending) return { err: 'Bukan waktunya.' };
    if (me.jailed) return { err: 'Napi tidak beraksi malam hari.' };
    const r = me.role, k = a.kind;
    // Plt. Koruptor: Broker/Buzzer memilih kasus fiktif tanpa menghabiskan aksi role-nya
    if (k === 'SCANDAL' && r !== 'KORUPTOR') {
      if (!scandalActors(G).some((p) => p.id === me.id)) return { err: 'Hanya Koruptor yang bisa menulis berita.' };
      const e = setKorChoice(G, me, a); if (e) return e; return { ok: true };
    }
    if (G.nightActs[me.id] && me.role !== 'KORUPTOR') return { err: 'Aksi sudah terkirim.' };
    if (k === 'DUMMY') { /* lewati malam: semua role boleh */ }
    else if (r === 'KORUPTOR') {
      if (k === 'SCANDAL') { const e = setKorChoice(G, me, a); if (e) return e; }
      else if (k !== 'AGREE' || !G.korChoice) return { err: 'Pilih target dan kartu.' };
    } else if (r === 'BROKER') {
      if (k === 'RECRUIT') { if (G.recruitUsed) return { err: 'Hak rekrut sudah terpakai.' }; if (!validTarget(G, me, a.target, { notDark: true, notPres: true })) return { err: 'Target tidak valid.' }; }
      else if (k !== 'PASS') return { err: 'Aksi tidak valid.' };
    } else if (r === 'BUZZER') { if (k !== 'FLIP' || !validTarget(G, me, a.target, {})) return { err: 'Target tidak valid.' }; }
    else if (r === 'KPK') {
      if (k === 'OTT') {
        const t = validTarget(G, me, a.target, { notPres: true }); if (!t) return { err: 'Target tidak valid (Presiden imun).' };
        if (!(G.investigations[me.id] || []).some((i) => i.id === t.id)) note(G, me.id, `⚠️ OTT ke ${t.name} tanpa sadap lebih dulu: berkasnya tetap terbit walau ia bersih.`, 'zinc');
      } else {
        const t = k === 'INVESTIGATE' && validTarget(G, me, a.target, {}); if (!t) return { err: 'Target tidak valid.' };
        const fac = isDark(t) ? 'GELAP' : 'REFORMIS';
        (G.investigations[me.id] = G.investigations[me.id] || []).push({ id: t.id, fac, night: G.day });
        // Aturan kpkDual: sadap tidak menghabiskan malam. KPK masih bisa OTT (atau selesai) setelah melihat hasil sadap.
        if (R(G, 'kpkDual') && (G.sadapNight = G.sadapNight || {})[me.id] !== G.day) { G.sadapNight[me.id] = G.day; return { ok: true, sadap: true }; }
      }
    } else if (r === 'JURNALIS') {
      if (k !== 'FACTCHECK' || !validTarget(G, me, a.target, { self: true }) || a.target === G.lastProtected[me.id]) return { err: 'Target tidak valid.' };
    } else if (r === 'PENGAMAT') { if (k !== 'OBSERVE' || !validTarget(G, me, a.target, {})) return { err: 'Target tidak valid.' }; }
    else if (k !== 'DUMMY') return { err: 'Aksi tidak valid.' };
    G.nightActs[me.id] = { kind: k, target: a.target == null ? null : a.target, card: a.card || null };
    maybeEndNight(G, now);
    return { ok: true };
  }
  function maybeEndNight(G, now) {
    if (G.pending) return;
    if (free(G).filter(active).every((p) => G.nightActs[p.id])) later(G, 'resolveNight', 1800, now);
  }
  function mkCase(G, src, sid, cid) {
    const n = G.cases.length + 1, c = { id: 'C' + n, src, suspect: sid, card: cid, no: `KS/${pad2(G.day)}/${G.code}/${n}`, vetoed: false };
    G.cases.push(c); P(G, sid).suspect = true; return c;
  }
  function resolveNight(G, now) {
    const acts = G.nightActs, visits = {};
    const byRole = (r) => free(G).filter((p) => p.role === r);
    // 1. Broker rekrut
    for (const br of byRole('BROKER')) {
      const a = acts[br.id]; if (!a || a.kind !== 'RECRUIT' || G.recruitUsed) continue;
      const t = P(G, a.target); if (!t || t.jailed || t.id === G.presidentId || isDark(t)) continue;
      G.recruitUsed = true; visits[br.id] = t.id;
      if (t.role === 'WARGA') {
        t.role = 'BUZZER'; t.recruited = true;
        note(G, br.id, `🤝 Rekrut berhasil: ${t.name} kini Buzzer.`, 'korup');
        note(G, t.id, '🤝 Anda menerima amplop. Anda kini BUZZER (Faksi Gelap). Cek kartu role Anda.', 'korup');
        G.players.filter((p) => isDark(p) && p.id !== t.id && p.id !== br.id).forEach((p) => note(G, p.id, `🤝 ${t.name} bergabung ke sindikat sebagai Buzzer.`, 'korup'));
      } else note(G, br.id, `🙅 ${t.name} menolak amplop (bukan Warga Sipil). Hak rekrut hangus.`, 'korup');
      break;
    }
    // 2. Jurnalis cek fakta
    const protectedSet = new Set();
    for (const j of byRole('JURNALIS')) { const a = acts[j.id]; if (a && a.kind === 'FACTCHECK') { protectedSet.add(a.target); visits[j.id] = a.target; G.lastProtected[j.id] = a.target; } else delete G.lastProtected[j.id]; }
    // 3. Koruptor: berita JELEK (fitnah) atau berita BAGUS (pencitraan)
    let tgt = null, cid = null, good = false;
    const kor = scandalActors(G);
    if (!G.korChoice && kor.length && kor.every(ai)) botScandal(G, rnd(kor));
    if (G.korChoice) { const t = P(G, G.korChoice.target); if (t && !t.jailed && t.id !== G.presidentId) { tgt = t.id; cid = G.korChoice.card; good = !!G.korChoice.good; visits[G.korChoice.by] = tgt; } }
    if (cid) G.deck = G.deck.filter((x) => x !== cid);
    // 4. Buzzer
    G.flipTarget = null;
    for (const bz of byRole('BUZZER')) { const a = acts[bz.id]; if (a && a.kind === 'FLIP') { G.flipTarget = a.target; visits[bz.id] = a.target; } }
    // 5. KPK
    const kpkOps = [];
    for (const k of byRole('KPK')) { const a = acts[k.id]; if (a && (a.kind === 'INVESTIGATE' || a.kind === 'OTT')) visits[k.id] = a.target; if (a && a.kind === 'OTT') kpkOps.push({ kpk: k.id, target: a.target }); }
    // 6. Pengamat
    for (const pg of byRole('PENGAMAT')) { const a = acts[pg.id]; if (a && a.kind === 'OBSERVE') visits[pg.id] = a.target; }
    for (const pg of byRole('PENGAMAT')) {
      const a = acts[pg.id]; if (!a || a.kind !== 'OBSERVE') continue;
      const v = visits[a.target], t = P(G, a.target);
      (G.observations[pg.id] = G.observations[pg.id] || []).push({ id: a.target, visited: v == null ? null : v, night: G.day });
      note(G, pg.id, `📊 Pengamatan: ${t.name} ${v != null ? 'semalam mendatangi ' + P(G, v).name : 'tidak ke mana-mana semalam'}.`, 'reform');
    }
    // berita: semua berkas (fitnah maupun OTT) tampil dengan bentuk yang sama; urutannya diacak
    const items = [], log = []; let shield = null;
    const darkTeam = () => G.players.filter((p) => isDark(p));
    if (tgt != null) {
      const t = P(G, tgt), blocked = protectedSet.has(tgt);
      if (!good) G.lastBadDay = G.day;
      if (good) {
        if (blocked) {
          byRole('JURNALIS').forEach((j) => { const a = acts[j.id]; if (a && a.kind === 'FACTCHECK' && a.target === tgt) note(G, j.id, `🎙️ Cek fakta Anda ke ${t.name} membongkar kampanye PENCITRAAN dari Koruptor untuk dia. Kampanye dibatalkan.`, 'reform'); });
          darkTeam().forEach((p) => note(G, p.id, `🔎 Pencitraan untuk ${t.name} dibongkar cek fakta Jurnalis.`, 'korup'));
          log.push(`pencitraan ${t.name} dibongkar Jurnalis`);
        } else { shield = tgt; log.push(`pencitraan untuk ${t.name}`); }
      } else if (blocked) {
        items.push({ head: `HOAKS! Kasus ${card(cid).title} terbantahkan cek fakta`, low: `${t.name} lolos dari fitnah. Tim cek fakta bergerak semalam.`, hoax: true });
        log.push('fitnah digagalkan cek fakta');
      } else {
        G.scandal++; stat(G, tgt, 'fitnah');
        const c = mkCase(G, 'FITNAH', tgt, cid);
        items.push({ head: card(cid).h.replace('{t}', `${persona(t.persona).n} ${t.name}`), low: `${persona(t.persona).e} ${t.name} kini berstatus TERSANGKA`, no: c.no });
        log.push(`${t.name} difitnah (${card(cid).title})`);
      }
    }
    for (const op of kpkOps) {
      const t = P(G, op.target); if (!t || t.jailed) continue;
      if (shield === t.id) {
        note(G, op.kpk, `🚨 OTT ke ${t.name} GAGAL: ia dilindungi kampanye pencitraan Koruptor.`, 'reform');
        darkTeam().forEach((p) => note(G, p.id, `🛡️ Pencitraan untuk ${t.name} menggagalkan OTT KPK semalam!`, 'korup'));
        log.push(`OTT atas ${t.name} gagal (pencitraan)`); continue;
      }
      if (G.cases.some((c) => c.suspect === t.id)) { note(G, op.kpk, `🚨 OTT ke ${t.name}: berkas atas dirinya sudah terbit semalam (digabung).`, 'reform'); continue; }
      const c = mkCase(G, 'KPK', t.id, rnd(CARDS.filter((x) => x.id !== cid)).id);
      items.push({ head: card(c.card).h.replace('{t}', `${persona(t.persona).n} ${t.name}`), low: `${persona(t.persona).e} ${t.name} kini berstatus TERSANGKA`, no: c.no });
      note(G, op.kpk, `🚨 OTT ke ${t.name} berhasil: berkas ${c.no} terbit.`, 'reform');
      log.push(`OTT KPK atas ${t.name}`);
    }
    const mix = shuffle(items);
    if (!mix.length) G.news = { kind: 'QUIET', head: 'Malam sepi, tikus sedang cuti bersama', low: 'Tidak ada kasus baru semalam.', more: [] };
    else G.news = { kind: mix.some((x) => !x.hoax) ? 'SUCCESS' : 'BLOCKED', head: mix[0].head, low: mix[0].low, more: mix.slice(1).map((x) => ({ head: x.head, low: x.low })) };
    if (G.pendingColumn) { G.news.column = G.pendingColumn; G.pendingColumn = null; }
    G.news.id = ++G.seq;
    G.history.push(`Malam ${G.day}: ${log.length ? log.join('; ') : 'sepi'}`);
    if (checkWin(G, now)) return;
    setPhase(G, 'MORNING', FIXED_T.morning, now);
  }

  // ------------------------------------------------------------------- DAY
  function startSidang(G, now) {
    G.sigs = {}; G.skip = {};
    sys(G, `☀️ Sidang Paripurna hari ke-${G.day} dibuka.${G.cases.length ? ` ${G.cases.map((c) => c.no).join(' & ')} menunggu keputusan Presiden.` : ''}`);
    setPhase(G, 'SIDANG', G.settings.timers.sidang, now);
  }
  function impeachNumbers(G) {
    const pool = free(G).filter((p) => p.id !== G.presidentId);
    let eff = 0; Object.keys(G.sigs).forEach((id) => { const p = P(G, id); if (!p || p.jailed || p.id === G.presidentId) return; eff += id === G.flipTarget ? -1 : 1; });
    eff = Math.max(0, eff); const needed = Math.max(1, Math.ceil(pool.length * R(G, 'impeachFrac')));
    return { eff, needed, pct: pool.length ? Math.min(100, Math.round((eff / pool.length) * 100)) : 0 };
  }
  function checkImpeach(G, now) {
    if (G.presidentId == null || G.decided || G.carryover) return false;
    const { eff, needed } = impeachNumbers(G); if (eff < needed) return false;
    const p = pres(G); p.impeachCount = (p.impeachCount || 0) + 1; G.lastImpeached = p.id;
    if (p.impeachCount >= 2) { p.impeached = true; p.banUntil = Infinity; } // cacat politik permanen di pemakzulan kedua
    G.presidentId = null; G.plt = false; G.sigs = {};
    G.pendingDecision = openCases(G).length > 0;
    G.history.push(`Hari ${G.day}: ${p.name} dimakzulkan`);
    sys(G, `🔥 ${p.name} DIMAKZULKAN rakyat${p.impeachCount >= 2 ? ' untuk kedua kalinya dan kini CACAT POLITIK' : ' (peringatan pertama)'}.${G.pendingDecision ? ' Keppres ditunda.' : ''} Pemilu kilat digelar.`);
    fx(G, 'impeach', '🔥 Istana dikepung!', `${p.name} dimakzulkan. ${G.pendingDecision ? 'Keppres ditunda, ' : ''}Pemilu kilat digelar.`, 3000, now);
    G.endsAt = 0; later(G, 'startElection', 3100, now, 'makzul');
    return true;
  }
  function maybeSkip(G, now) {
    const pool = free(G).filter(active), n = Object.keys(G.skip).filter((id) => { const p = P(G, id); return p && !p.jailed; }).length;
    if (pool.length && n >= Math.ceil(pool.length * 0.6)) { sys(G, '⏭️ Mayoritas sidang siap. Berkas naik ke meja Presiden.'); startDecision(G, now); }
  }
  function startDecision(G, now) {
    G.decided = false;
    setPhase(G, 'DECISION', FIXED_T.decision, now);
    if (G.presidentId == null) { G.endsAt = 0; later(G, 'afterDecision', 1500, now); }
  }
  function doVeto(G, caseId, now) {
    const c = openCases(G).find((x) => x.id === caseId) || (caseId == null ? openCases(G)[0] : null);
    if (!c || !G.vetoAvailable || G.decided) return { err: 'Veto tidak bisa dipakai sekarang.' };
    c.vetoed = true; G.vetoAvailable = false; const s = P(G, c.suspect); if (s) s.suspect = false;
    if (c.src === 'FITNAH') G.scandal = Math.max(0, G.scandal - 1);
    sys(G, `✨ Presiden ${pres(G).name} menggunakan HAK VETO. Kasus ${c.no} dibatalkan.`);
    G.history.push(`Hari ${G.day}: Veto atas ${c.no}`);
    fx(G, 'veto', '✨ VETO!', `Kasus ${c.no} dibatalkan.`, 1800, now);
    return { ok: true };
  }
  // Bebaskan napi: semua jabatan lama dicabut, jadi Warga Sipil biasa (Reformis)
  function freePrisoner(G, s) {
    const wasDark = isDark(s);
    s.jailed = false; s.role = 'WARGA'; s.recruited = false; s.headlineRight = false; s.exNapi = true;
    note(G, s.id, '🔓 Anda bebas, tapi semua jabatan lama dicabut. Anda kini WARGA SIPIL biasa (Reformis). Cek kartu role Anda.', 'reform');
    if (wasDark) G.players.filter((p) => isDark(p)).forEach((p) => note(G, p.id, `🚪 ${s.name} keluar dari sindikat setelah bebas. Ia kini Warga Sipil biasa.`, 'korup'));
    return `${s.name} keluar dari Rutan Negara sebagai Warga Sipil biasa.`;
  }
  function applyDecision(G, kind, pid, now) {
    if (G.phase !== 'DECISION' || G.decided) return { err: 'Keputusan sudah diambil.' };
    let title = '', sub = '';
    const clearSuspects = () => G.players.forEach((p) => (p.suspect = false));
    if (kind === 'JAIL') {
      const c = openCases(G).find((x) => x.suspect === pid) || (pid == null ? openCases(G)[0] : null);
      if (!c) return { err: 'Tidak ada tersangka untuk dijebloskan.' };
      const s = P(G, c.suspect); s.jailed = true; s.jailedDay = G.day; clearSuspects(); if (s.role === 'KPK') G.kpkEverJailed = true;
      title = 'DIJEBLOSKAN'; sub = `${s.name} dipenjara atas ${card(c.card).title}.`; G.history.push(`Hari ${G.day}: ${s.name} dipenjara`);
      if (s.role === 'JURNALIS') {
        if (ai(s)) G.pendingColumn = { by: s.id, text: rnd(COLUMN_LINES) };
        else { s.headlineRight = true; note(G, s.id, '📰 Anda mendapat Hak Headline. Tulis dari sel Anda di Rutan Negara.', 'istana'); }
      }
    } else if (kind === 'FREE') {
      const s = P(G, pid); if (!s || !s.jailed) return { err: 'Pilih napi yang valid.' };
      title = 'DIBEBASKAN'; sub = freePrisoner(G, s); clearSuspects();
      G.history.push(`Hari ${G.day}: ${s.name} dibebaskan`);
    } else { title = 'STATUS QUO'; sub = 'Presiden memilih diam. Tuduhan dikesampingkan.'; clearSuspects(); }
    G.decided = true; G.endsAt = 0;
    sys(G, `🏛️ KEPPRES No. ${pad2(G.day)}/${G.code}: ${sub}`);
    fx(G, 'stamp', title, sub, 2600, now);
    if (!checkWin(G, now)) later(G, 'afterDecision', 2700, now);
    return { ok: true };
  }
  function afterDecision(G, now) {
    G.flipTarget = null; G.appeals = []; G.expertReport = null;
    if (G.carryover) { G.carryover = false; startNight(G, now); return; }
    if (G.presidentId == null) { startElection(G, 'kosong', now); return; }
    G.term.round++;
    if (G.term.round > 2) { sys(G, `🗓️ Masa jabatan ${G.plt ? 'Plt. ' : ''}${pres(G).name} berakhir.`); G.history.push(`Masa jabatan ${pres(G).name} selesai`); startElection(G, 'habis', now); }
    else startNight(G, now);
  }
  function checkWin(G, now) {
    let w = null, r = '';
    if (G.players.filter(isDark).every((p) => p.jailed)) { w = 'REFORMIS'; r = 'Seluruh sindikat mendekam di Rutan Negara. Untuk sementara.'; }
    else if (G.players.filter((p) => !isDark(p)).every((p) => p.jailed)) { w = 'GELAP'; r = 'Semua Reformis sudah dipenjara. Yang tersisa di luar hanya yang “bisa diatur”.'; }
    else if (G.darkTerms >= R(G, 'darkTerms')) { w = 'GELAP'; r = 'Koruptor terpilih Presiden untuk ketiga kalinya. Demokrasi bekerja, sayangnya.'; }
    if (!w) return false;
    G.winner = w; G.reason = r; G.pending = null; setPhase(G, 'END', 0, now); return true;
  }

  // --------------------------------------------------------------- ACTIONS
  function act(G, pid, a, now) {
    now = now || Date.now();
    const me = P(G, pid); if (!me || !a || typeof a.t !== 'string') return { err: 'Pemain tidak dikenal.' };
    const res = dispatch(G, me, a, now);
    if (res && res.ok) bump(G, now);
    return res || { err: 'Aksi tidak dikenal.' };
  }
  function bump(G, now) { G.rev++; G.updatedAt = now; }
  function dispatch(G, me, a, now) {
    const isCreator = me.id === G.creatorId, ph = G.phase;
    switch (a.t) {
      // lobby
      case 'persona': if (ph !== 'LOBBY') return; setPersona(G, me, a.persona); return { ok: true };
      case 'rename': if (ph !== 'LOBBY') return; me.name = uniqueName(G, filt(clean(a.name, 14)) || me.name, me.id); return { ok: true };
      case 'settings': {
        if (ph !== 'LOBBY' || !isCreator) return { err: 'Hanya pembuat room.' };
        const s = a.settings || {}; if (typeof s.auto === 'boolean') G.settings.auto = s.auto;
        if (Array.isArray(s.dist) && s.dist.length === 7) G.settings.dist = s.dist.map((x, i) => Math.max(i === 0 ? 1 : 0, Math.min(NINE_PLUS.includes(DIST_KEYS[i]) ? 1 : 3, x | 0)));
        if ([5, 6, 7].includes(s.scandalTarget)) G.settings.scandalTarget = s.scandalTarget;
        if (s.timers) { if ([30, 45, 60].includes(s.timers.night)) G.settings.timers.night = s.timers.night; if ([60, 120, 180, 300].includes(s.timers.sidang)) G.settings.timers.sidang = s.timers.sidang; }
        return { ok: true };
      }
      case 'addBot': if (ph !== 'LOBBY' || !isCreator) return { err: 'Hanya pembuat room.' }; return addBot(G);
      case 'kick': {
        if (ph !== 'LOBBY' || !isCreator || a.id === me.id) return { err: 'Tidak bisa.' };
        const i = G.players.findIndex((p) => p.id === a.id); if (i < 0) return { err: 'Tidak ada.' };
        const [p] = G.players.splice(i, 1); if (!p.bot) { G.banned = G.banned || {}; G.banned[p.id] = true; sys(G, `🚪 ${p.name} dikeluarkan dari ruang sidang.`); } return { ok: true };
      }
      case 'leave': {
        if (ph !== 'LOBBY') { me.connected = false; me.offAt = now; if (ph !== 'END') setAuto(G, me, true, now); else ensureHost(G, now, true); return { ok: true }; }
        G.players = G.players.filter((p) => p.id !== me.id); sys(G, `🚪 ${me.name} meninggalkan ruang sidang.`);
        if (isCreator) ensureHost(G, now, true);
        return { ok: true };
      }
      case 'start': if (ph !== 'LOBBY' || !isCreator) return { err: 'Hanya pemegang palu yang bisa memulai.' }; return startGame(G, now);
      case 'extend': {
        if (ph !== 'LOBBY' || !isCreator) return { err: 'Hanya pemegang palu.' };
        if (!G.lobby.cdAt) return { err: 'Hitung mundur belum berjalan.' };
        if (G.lobby.ext >= LOBBY_EXT_MAX) return { err: `Sudah ditambah ${LOBBY_EXT_MAX}x. Mulai saja, yuk.` };
        G.lobby.ext++; G.lobby.cdAt += LOBBY_CD; sys(G, `⏳ ${me.name} menambah waktu tunggu 60 detik.`); return { ok: true };
      }
      case 'fillBots': {
        if (ph !== 'LOBBY' || !isCreator) return { err: 'Hanya pemegang palu.' };
        let k = 0; while (G.players.length < MIN_PLAYERS) { if (addBot(G).err) break; k++; }
        if (k) sys(G, `🤖 ${k} bot ikut mengisi kursi kosong.`); return { ok: true };
      }
      case 'visibility': {
        if (ph !== 'LOBBY' || !isCreator) return { err: 'Hanya pemegang palu.' };
        G.settings.public = !!a.public; if (!G.settings.public) G.lobby.cdAt = 0;
        sys(G, G.settings.public ? '🌐 Room dibuka untuk umum.' : '🔒 Room dijadikan privat (hanya lewat kode).'); return { ok: true };
      }
      case 'replay': {
        if (ph !== 'END' || !isCreator) return { err: 'Hanya pembuat room.' };
        G.players = G.players.filter((p) => p.bot || p.connected);
        G.players.forEach((p) => Object.assign(p, { auto: false, role: null, jailed: false, suspect: false, impeached: false, impeachCount: 0, banUntil: 0, recruited: false, headlineRight: false, ready: false, exNapi: false }));
        Object.assign(G, { winner: null, reason: '', presidentId: null, cases: [], scandal: 0, pending: null, fx: null, news: null });
        G.lobby = { cdAt: 0, ext: 0, openedAt: now };
        G.chat = []; sys(G, '🔁 Ruang sidang dibuka lagi. Ronde baru!'); setPhase(G, 'LOBBY', 0, now); return { ok: true };
      }
      // reveal
      case 'ready': if (ph !== 'REVEAL') return; me.ready = true; if (G.players.filter(active).every((p) => p.ready)) later(G, 'startElection', 800, now, 'awal'); return { ok: true };
      // election
      case 'vote': {
        if (ph !== 'ELECTION' || !G.election || G.election.done) return { err: 'Pemilu sudah ditutup.' };
        if (G.election.cands.includes(me.id)) return { err: 'Kandidat tidak boleh mencoblos.' };
        if (!G.election.cands.includes(a.cand)) return { err: 'Kandidat tidak valid.' };
        G.election.votes[me.id] = a.cand; maybeFinishElection(G, now); return { ok: true };
      }
      // night
      case 'night': return nightAction(G, me, a, now);
      case 'dark': {
        if (!isDark(me) || ph === 'LOBBY' || ph === 'END') return { err: 'Bukan anggota.' };
        const text = clean(a.text, 160); if (!text) return; if (now - me.lastChatAt < 800) return { err: 'Pelan-pelan.' }; me.lastChatAt = now;
        G.dark.push({ id: ++G.seq, from: me.id, text }); if (G.dark.length > 50) G.dark.shift(); return { ok: true };
      }
      // chat & day
      case 'chat': case 'react': {
        if (!['LOBBY', 'ELECTION', 'SIDANG', 'DECISION', 'END'].includes(ph)) return { err: 'Chat dibuka saat siang.' };
        if (me.jailed) return { err: 'Napi hanya bisa mengirim surat.' };
        const text = a.t === 'react' ? (['🤔', '🙄', '🔥', '🧂', '😂', '👏'].includes(a.emoji) ? a.emoji : '') : filt(clean(a.text, 200));
        if (!text) return; if (now - me.lastChatAt < 1200) return { err: 'Pelan-pelan, 1 pesan per 1,2 detik.' };
        me.lastChatAt = now; say(G, me.id, text); return { ok: true };
      }
      case 'letter': {
        if (!['SIDANG', 'DECISION'].includes(ph) || !me.jailed || me.letterDay === G.day) return { err: 'Surat hari ini sudah terkirim.' };
        const text = filt(clean(a.text, 200)); if (!text) return; me.letterDay = G.day; say(G, me.id, text, { letter: true }); return { ok: true };
      }
      case 'sign': {
        if (!['SIDANG', 'DECISION'].includes(ph) || me.jailed || me.id === G.presidentId || G.decided || G.carryover || G.presidentId == null || G.pending) return { err: 'Petisi tidak bisa ditandatangani sekarang.' };
        if (a.on) { if (!G.sigs[me.id]) { G.sigs[me.id] = true; stat(G, me.id, 'sign'); sys(G, '⚡ Seseorang menandatangani petisi pemakzulan.'); checkImpeach(G, now); } }
        else if (G.sigs[me.id]) { delete G.sigs[me.id]; sys(G, '⚡ Seseorang menarik tanda tangannya.'); }
        return { ok: true };
      }
      case 'skip': if (ph !== 'SIDANG' || me.jailed || G.pending) return; G.skip[me.id] = true; maybeSkip(G, now); return { ok: true };
      case 'appeal': {
        if (!me.jailed || me.appealUsed || !['SIDANG', 'DECISION'].includes(ph) || G.presidentId == null) return { err: 'Banding tidak bisa diajukan sekarang.' };
        me.appealUsed = true; const text = clean(a.text, 140) || rnd(APPEAL_LINES);
        G.appeals.push({ from: me.id, text }); note(G, G.presidentId, `📨 Surat banding baru dari ${me.name}.`, 'istana'); return { ok: true };
      }
      case 'headline': {
        if (!me.jailed || !me.headlineRight) return { err: 'Tidak punya Hak Headline.' };
        const text = filt(clean(a.text, 90)); if (!text) return { err: 'Headline kosong.' };
        me.headlineRight = false; G.pendingColumn = { by: me.id, text }; note(G, me.id, '📰 Headline Anda masuk antrean redaksi untuk pagi berikutnya.', 'istana'); return { ok: true };
      }
      case 'testify': {
        const oc = openCases(G);
        if (me.role !== 'GURU_BESAR' || me.jailed || G.expertUsed || !['SIDANG', 'DECISION'].includes(ph) || !oc.length || G.decided || G.presidentId == null) return { err: 'Kesaksian tidak bisa diberikan sekarang.' };
        G.expertUsed = true; G.expertReport = {}; oc.forEach((c) => { G.expertReport[c.suspect] = isDark(P(G, c.suspect)) ? 'GELAP' : 'REFORMIS'; });
        sys(G, '🧑‍🏫 Seorang Ahli menyerahkan kajian ke meja Presiden.'); note(G, G.presidentId, '🧑‍🏫 Kajian Ahli baru masuk ke meja Anda.', 'istana'); note(G, me.id, '🧑‍🏫 Kajian Anda sudah di meja Presiden.', 'reform');
        return { ok: true };
      }
      case 'grasi': {
        if (!R(G, 'grasi')) return { err: 'Grasi tidak berlaku di ronde ini.' };
        if (!['SIDANG', 'DECISION'].includes(ph) || me.id !== G.presidentId || G.decided || G.grasiUsed || G.pending) return { err: 'Grasi tidak bisa diberikan sekarang.' };
        const s = P(G, a.prisoner); if (!s || !s.jailed) return { err: 'Pilih napi yang valid.' };
        G.grasiUsed = true; const sub = freePrisoner(G, s); G.history.push(`Hari ${G.day}: ${s.name} diberi grasi`);
        sys(G, `🕊️ GRASI Presiden ${me.name}: ${sub}`); fx(G, 'stamp', 'GRASI', sub, 2200, now); checkWin(G, now); return { ok: true };
      }
      case 'veto': if (ph !== 'DECISION' || me.id !== G.presidentId) return { err: 'Hanya Presiden.' }; return doVeto(G, a.case, now);
      case 'decide': if (ph !== 'DECISION' || me.id !== G.presidentId) return { err: 'Hanya Presiden.' }; return applyDecision(G, a.kind === 'JAIL' || a.kind === 'FREE' ? a.kind : 'STATUS_QUO', a.kind === 'JAIL' ? a.suspect : a.prisoner, now);
    }
    return null;
  }

  // ------------------------------------------------------------------ TICK
  function tick(G, now) {
    now = now || Date.now();
    const before = G.rev;
    housekeeping(G, now);
    if (G.pending && now >= G.pending.at) {
      const { step, arg } = G.pending; G.pending = null;
      if (step === 'startElection') startElection(G, arg || 'awal', now);
      else if (step === 'finishElection') finishElection(G, now);
      else if (step === 'afterInstall') {
        if (G.pendingDecision) { G.pendingDecision = false; G.carryover = true; sys(G, `📁 Keppres tertunda (${openCases(G).map((c) => c.no).join(' & ')}) kini di meja Presiden ${pres(G).name}.`); startDecision(G, now); }
        else startNight(G, now);
      }
      else if (step === 'resolveNight') resolveNight(G, now);
      else if (step === 'afterDecision') afterDecision(G, now);
      bump(G, now);
    }
    if (!G.pending && G.endsAt && now >= G.endsAt) {
      const ph = G.phase; G.endsAt = 0;
      if (ph === 'REVEAL') startElection(G, 'awal', now);
      else if (ph === 'ELECTION') finishElection(G, now);
      else if (ph === 'NIGHT') resolveNight(G, now);
      else if (ph === 'MORNING') startSidang(G, now);
      else if (ph === 'SIDANG') startDecision(G, now);
      else if (ph === 'DECISION' && !G.decided) applyDecision(G, 'STATUS_QUO', null, now);
      bump(G, now);
    }
    runBots(G, now);
    if (G.fx && now > G.fx.at + G.fx.dur + 500) { G.fx = null; bump(G, now); }
    return G.rev !== before;
  }
  function setConnected(G, pid, on, now) {
    const p = P(G, pid); if (!p || p.bot || p.connected === on) return false;
    now = now || Date.now();
    p.connected = on; if (!on) p.offAt = now; bump(G, now);
    if (on && p.auto) setAuto(G, p, false, now);
    // Pemain yang putus tidak boleh menahan fase
    if (!on) {
      if (G.phase === 'NIGHT') maybeEndNight(G, now);
      if (G.phase === 'ELECTION') maybeFinishElection(G, now);
      if (G.phase === 'REVEAL' && G.players.filter(active).every((x) => x.ready)) later(G, 'startElection', 800, now, 'awal');
    }
    return true;
  }

  // ---------------------------------------------- ROOM ONLINE: host, lobi, AFK
  function setAuto(G, p, on, now) {
    if (!p || p.bot || !!p.auto === on) return;
    p.auto = on;
    if (on) { sys(G, `🤖 ${p.name} AFK — autopilot mengambil alih sampai ia kembali.`); if (!['LOBBY', 'END'].includes(G.phase)) G.botAt[p.id] = now + 1200; }
    else { sys(G, `👋 ${p.name} kembali ke sidang.`); delete G.botAt[p.id]; }
    bump(G, now);
  }
  // Palu sidang pindah ke manusia yang paling lama hadir dan masih tersambung.
  function ensureHost(G, now, force) {
    const h = P(G, G.creatorId);
    const ok = h && !h.bot && (h.connected || (!force && now - (h.offAt || now) < HOST_GRACE_MS));
    if (ok) return false;
    const next = G.players.find((p) => !p.bot && p.connected && p.id !== G.creatorId);
    if (!next) { if (!h) G.creatorId = null; return false; }
    G.creatorId = next.id; sys(G, `🔁 ${next.name} kini memegang palu sidang.`); bump(G, now); return true;
  }
  function housekeeping(G, now) {
    if (!G.lobby) G.lobby = { cdAt: 0, ext: 0, openedAt: now };
    if (G.phase === 'LOBBY' || G.phase === 'END') ensureHost(G, now, false);
    if (G.phase === 'LOBBY') {
      // kursi hantu: pemain yang putus lama di lobi dikeluarkan supaya kursi bisa dipakai orang lain
      const ghosts = G.players.filter((p) => !p.bot && !p.connected && now - (p.offAt || now) > GHOST_MS);
      if (ghosts.length) {
        G.players = G.players.filter((p) => !ghosts.includes(p));
        ghosts.forEach((p) => sys(G, `🚪 ${p.name} terputus terlalu lama dan keluar dari ruang tunggu.`));
        ensureHost(G, now, true); bump(G, now);
      }
      const L = G.lobby, valid = distCounts(G).valid && G.players.some((p) => !p.bot);
      if (G.settings.public && valid && !L.cdAt) { L.cdAt = now + LOBBY_CD; L.ext = 0; sys(G, '⏱️ Kursi cukup! Sidang mulai otomatis dalam 60 detik.'); bump(G, now); }
      else if (L.cdAt && (!valid || !G.settings.public)) { L.cdAt = 0; if (!valid) sys(G, '⏸️ Hitung mundur dibatalkan, pemain kurang.'); bump(G, now); }
      if (L.cdAt && G.players.length >= MAX_PLAYERS && L.cdAt - now > 10000) { L.cdAt = now + 10000; sys(G, '🪑 Kursi penuh! Mulai dalam 10 detik.'); bump(G, now); }
      if (L.cdAt && now >= L.cdAt) { L.cdAt = 0; if (startGame(G, now).ok) bump(G, now); }
    } else if (G.phase !== 'END') {
      for (const p of G.players) if (!p.bot && !p.auto && !p.connected && now - (p.offAt || now) > AFK_MS) setAuto(G, p, true, now);
    }
  }

  // ------------------------------------------------------------------ BOTS
  function scheduleBots(G, now, min, max) { G.botAt = {}; G.players.forEach((p) => { if (ai(p)) G.botAt[p.id] = now + min + Math.random() * (max - min); }); }
  function runBots(G, now) {
    for (const p of G.players) {
      if (!ai(p)) continue; const at = G.botAt[p.id]; if (at == null || now < at || G.pending) continue;
      delete G.botAt[p.id];
      const next = botAct(G, p, now); if (next) G.botAt[p.id] = now + next;
      bump(G, now);
    }
  }
  function botScandal(G, p) {
    const pool = free(G).filter((x) => !isDark(x) && x.id !== G.presidentId); if (!pool.length) return;
    const all = free(G).filter((x) => x.id !== G.presidentId);
    const cool = R(G, 'fitnahCooldown') && G.lastBadDay === G.day - 1;
    if (all.length && (cool || Math.random() < 0.2)) { G.korChoice = { target: rnd(all.filter(isDark).length ? all.filter(isDark) : all).id, card: null, by: p.id, good: true }; return; }
    G.korChoice = { target: rnd(pool).id, card: rnd(G.hand.length ? G.hand : CARDS.map((c) => c.id)), by: p.id, good: false };
  }
  function botAct(G, p, now) {
    const ph = G.phase, r = (a, b) => a + Math.random() * (b - a);
    const others = () => free(G).filter((x) => x.id !== p.id);
    if (ph === 'REVEAL') { dispatch(G, p, { t: 'ready' }, now); return 0; }
    if (ph === 'ELECTION') {
      const e = G.election; if (!e || e.done) return 0;
      if (e.cands.includes(p.id)) { if (!p.jailed && Math.random() < 0.6) say(G, p.id, rnd(ELECTION_LINES)); return r(8000, 15000); }
      if (e.votes[p.id] == null) {
        const [a, b] = e.cands.map((id) => P(G, id)); let pick = rnd(e.cands);
        if (isDark(p) && isDark(a) !== isDark(b)) pick = isDark(a) ? a.id : b.id;
        dispatch(G, p, { t: 'vote', cand: pick }, now);
      }
      return 0;
    }
    if (ph === 'NIGHT') {
      if (p.jailed || G.nightActs[p.id]) {
        if (isDark(p) && !p.jailed && G.players.some((x) => !x.bot && isDark(x)) && Math.random() < 0.35) { G.dark.push({ id: ++G.seq, from: p.id, text: rnd(DARK_LINES).replace('{p}', pres(G) ? pres(G).name : 'Presiden') }); }
        return 0;
      }
      const o = others(); let a = { kind: 'DUMMY' };
      switch (p.role) {
        case 'KORUPTOR': {
          const humans = scandalActors(G).filter((x) => !ai(x));
          if (G.korChoice) a = { kind: 'AGREE' };
          else if (!humans.length || now > G.endsAt - 6000) { botScandal(G, p); if (!G.korChoice) return 0; a = { kind: 'AGREE' }; }
          else return Math.max(1000, G.endsAt - 5000 - now);
          break;
        }
        case 'BROKER': { const pool = o.filter((x) => !isDark(x) && x.id !== G.presidentId); a = !G.recruitUsed && G.day >= 2 && pool.length && Math.random() < 0.5 ? { kind: 'RECRUIT', target: rnd(pool).id } : { kind: 'PASS' }; break; }
        case 'BUZZER': { const pool = o.filter((x) => !isDark(x)); if (pool.length) a = { kind: 'FLIP', target: rnd(pool).id }; break; }
        case 'KPK': {
          const inv = G.investigations[p.id] || [], done = inv.map((i) => i.id);
          const guilty = inv.filter((i) => i.fac === 'GELAP').map((i) => P(G, i.id)).filter((x) => x && !x.jailed && x.id !== G.presidentId);
          const pool = o.filter((x) => !done.includes(x.id) && x.id !== G.presidentId);
          if (guilty.length) { a = { kind: 'OTT', target: rnd(guilty).id }; break; }
          if (pool.length && Math.random() < 0.5) { a = { kind: 'OTT', target: rnd(pool).id }; break; }
          if (o.length) a = { kind: 'INVESTIGATE', target: rnd(pool.length ? pool : o).id }; break;
        }
        case 'JURNALIS': { const pool = free(G).filter((x) => x.id !== G.lastProtected[p.id]); a = { kind: 'FACTCHECK', target: rnd(pool).id }; break; }
        case 'PENGAMAT': if (o.length) a = { kind: 'OBSERVE', target: rnd(o).id }; break;
      }
      // Plt. Koruptor bot
      if (p.role !== 'KORUPTOR' && isDark(p) && !G.korChoice && scandalActors(G).every(ai) && scandalActors(G).some((x) => x.id === p.id)) botScandal(G, p);
      const res = nightAction(G, p, a, now); if (res.err) nightAction(G, p, { kind: p.role === 'BROKER' ? 'PASS' : p.role === 'KPK' ? 'INVESTIGATE' : 'DUMMY', target: o.length ? rnd(o).id : null }, now);
      return 0;
    }
    if (ph === 'SIDANG' || ph === 'DECISION') {
      const oc = openCases(G), c = oc[0], prez = pres(G);
      if (p.jailed) {
        if (p.letterDay !== G.day && Math.random() < 0.18) { p.letterDay = G.day; say(G, p.id, rnd(LETTER_LINES), { letter: true }); }
        if (!p.appealUsed && prez && Math.random() < 0.15) dispatch(G, p, { t: 'appeal', text: rnd(APPEAL_LINES) }, now);
        return r(8000, 16000);
      }
      if (ph === 'DECISION' && p.id === G.presidentId && !G.decided) { botDecide(G, p, now); return 0; }
      if (Math.random() < 0.7) say(G, p.id, rnd(SIDANG_LINES).replace('{s}', c ? P(G, c.suspect).name : rnd(G.players).name).replace('{p}', prez ? prez.name : 'Presiden'));
      if (ph === 'SIDANG' && p.id !== G.presidentId && prez && !G.sigs[p.id] && Math.random() < 0.1) dispatch(G, p, { t: 'sign', on: true }, now);
      if (p.role === 'GURU_BESAR' && !G.expertUsed && c && Math.random() < 0.3) dispatch(G, p, { t: 'testify' }, now);
      if (ph === 'SIDANG' && !G.skip[p.id] && now - G.phaseStart > 40000 && Math.random() < 0.4) dispatch(G, p, { t: 'skip' }, now);
      return r(7000, 15000);
    }
    return 0;
  }
  function botDecide(G, p, now) {
    const rep = G.expertReport || {}, prisoners = G.players.filter((x) => x.jailed);
    let oc = openCases(G);
    if (oc.length && G.vetoAvailable && !isDark(p)) {
      const c = oc.find((x) => rep[x.suspect] === 'REFORMIS') || (Math.random() < 0.15 ? rnd(oc) : null);
      if (c) { doVeto(G, c.id, now); oc = openCases(G); }
    }
    let kind = 'STATUS_QUO', pid = null;
    if (oc.length) {
      if (isDark(p)) { const t = oc.find((c) => !isDark(P(G, c.suspect))); if (t && Math.random() < 0.85) { kind = 'JAIL'; pid = t.suspect; } }
      else {
        const proven = oc.find((c) => rep[c.suspect] === 'GELAP');
        if (proven) { kind = 'JAIL'; pid = proven.suspect; }
        else { const cand = oc.filter((c) => rep[c.suspect] !== 'REFORMIS'); if (cand.length && Math.random() < 0.6) { kind = 'JAIL'; pid = rnd(cand).suspect; } }
      }
    }
    if (kind === 'STATUS_QUO' && prisoners.length && Math.random() < 0.3) {
      kind = 'FREE'; const ap = G.appeals.map((a) => a.from).filter((id) => P(G, id).jailed);
      pid = ap.length ? ap[0] : rnd(prisoners).id;
      if (isDark(p)) { const d = prisoners.find(isDark); if (d) pid = d.id; }
    }
    applyDecision(G, kind, pid, now);
  }

  // ----------------------------------------------------------------- VIEWS
  function publicView(G, now) {
    now = now || Date.now();
    const end = G.phase === 'END', e = G.election;
    return {
      code: G.code, rev: G.rev, now, phase: G.phase, endsAt: G.endsAt, phaseDur: G.phaseDur, phaseStart: G.phaseStart, locked: !!G.pending,
      day: G.day, creatorId: G.creatorId, settings: G.settings,
      lobby: G.phase === 'LOBBY' && G.lobby ? { cdAt: G.lobby.cdAt, ext: G.lobby.ext, extMax: LOBBY_EXT_MAX, botOffer: !!G.settings.public && G.players.length < MIN_PLAYERS && now - G.lobby.openedAt >= BOT_OFFER_MS } : null, dist: G.phase === 'LOBBY' ? distCounts(G) : null,
      players: G.players.map((p) => ({ id: p.id, name: p.name, persona: p.persona, bot: p.bot, connected: p.connected, afk: !!p.auto, jailed: p.jailed, jailedDay: p.jailedDay, suspect: p.suspect, impeached: p.impeached, impeachCount: p.impeachCount || 0, appealUsed: p.appealUsed, ready: p.ready, exNapi: !!p.exNapi, role: end ? p.role : undefined, recruited: end ? p.recruited : undefined })),
      scandal: G.scandal, presidentId: G.presidentId, term: G.term, vetoAvailable: G.vetoAvailable, plt: !!G.plt,
      cases: G.cases.map((c) => ({ id: c.id, suspect: c.suspect, card: c.card, no: c.no, vetoed: c.vetoed, open: openCases(G).includes(c) })),
      election: e ? { cands: e.cands, visi: e.visi, reason: e.reason, done: e.done, votesIn: Object.keys(e.votes).length, voters: electionVoters(G).length } : null,
      impeach: impeachNumbers(G), skip: { n: Object.keys(G.skip).length, need: Math.ceil(free(G).filter(active).length * 0.6) },
      nightIn: G.phase === 'NIGHT' ? Object.keys(G.nightActs).length : 0, nightTotal: G.phase === 'NIGHT' ? free(G).length : 0,
      news: G.news, fx: G.fx, chat: G.chat.slice(-60), decided: G.decided, carryover: G.carryover, pendingDecision: G.pendingDecision, expertUsed: G.expertUsed,
      winner: G.winner, reason: G.reason, history: end ? G.history : [], stats: end ? G.stats : {},
    };
  }
  function privateView(G, pid) {
    const me = P(G, pid); if (!me) return null;
    const dark = isDark(me), r = me.role;
    const v = {
      id: pid, role: r, faction: r ? (dark ? 'GELAP' : 'REFORMIS') : null, notes: G.notes[pid] || [],
      nightAct: G.nightActs[pid] || null, myVote: G.election && G.election.votes[pid] != null ? G.election.votes[pid] : null,
      signed: !!G.sigs[pid], skipped: !!G.skip[pid], letterUsed: me.letterDay === G.day, headlineRight: me.headlineRight,
    };
    if (dark && r) {
      v.allies = G.players.filter((p) => p.id !== pid && isDark(p)).map((p) => ({ id: p.id, role: p.role }));
      v.dark = G.dark.slice(-40); v.darkTerms = G.darkTerms; v.korChoice = G.korChoice;
      v.scandalActor = !me.jailed && scandalActors(G).some((p) => p.id === pid); v.plt = v.scandalActor && r !== 'KORUPTOR';
      if (v.scandalActor) v.hand = G.hand;
    }
    if (r === 'KPK') v.investigations = G.investigations[pid] || [];
    if (r === 'PENGAMAT') v.observations = G.observations[pid] || [];
    if (r === 'JURNALIS') v.lastProtected = G.lastProtected[pid] == null ? null : G.lastProtected[pid];
    if (r === 'BROKER') v.recruitAvailable = !G.recruitUsed;
    if (r === 'GURU_BESAR') v.expertUsed = G.expertUsed;
    if (r === 'KORUPTOR' || (dark && scandalActors(G).some((p) => p.id === pid))) v.korCooldown = !!(R(G, 'fitnahCooldown') && G.lastBadDay === G.day - 1);
    if (pid === G.presidentId) v.president = { grasiAvailable: !!(R(G, 'grasi') && !G.grasiUsed), vetoAvailable: G.vetoAvailable, appeals: G.appeals, expertReport: G.expertReport };
    return v;
  }

  // Ringkasan untuk daftar room publik (tanpa rahasia)
  function summary(G, now) {
    const h = P(G, G.creatorId);
    return { code: G.code, pub: !!(G.settings && G.settings.public), phase: G.phase, n: G.players.length, humans: G.players.filter((p) => !p.bot).length,
      host: h ? h.name : '', cdAt: G.lobby ? G.lobby.cdAt : 0, at: now || Date.now() };
  }
  const Engine = {
    MAX_DAYS, summary, filt,
    create, join, act, tick, setConnected, publicView, privateView, distCounts,
    DATA: { PERSONAS, ROLES, WIN_TEXT, DIST, DIST_KEYS, NINE_PLUS, CARDS, DARK_ROLES, MIN_PLAYERS, MAX_PLAYERS },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
