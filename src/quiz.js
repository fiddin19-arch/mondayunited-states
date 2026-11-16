// Penyusunan soal & penilaian — semua kunci jawaban tetap di server
import { numQ, shuffle } from "./gen.js";
import { BANK, PBANK } from "./content.gen.js";

export const TK = {
  IV: { id: "IV", ij: "D-III / Akademi / Sarjana Muda", gol: "Pengatur", gr: "II/c", lvl: 1, pg: 450 },
  V: { id: "V", ij: "S-1 / D-IV", gol: "Penata Muda", gr: "III/a", lvl: 2, pg: 475 },
  VI: { id: "VI", ij: "S-2 / Dokter / Apoteker / Spesialis I", gol: "Penata Muda Tk. I", gr: "III/b", lvl: 3, pg: 475 },
};
export const CAT_NAMES = { kmk: "Substansi Kemenkeu", asn: "Etika & Kepegawaian ASN", twk: "Wawasan Kebangsaan", ver: "Verbal", num: "Numerik", log: "Logika" };
export const PCAT_NAMES = { sin: "Sinonim", ant: "Antonim", ana: "Analogi", der: "Deret Angka & Huruf", ari: "Aritmatika & Cerita", sil: "Silogisme", anl: "Logika Analitis", epp: "Kepribadian EPPS", pap: "Kepribadian PAPI", spa: "Spasial & Visual" };
export const PCAT_GROUP = { sin: "Tes Verbal", ant: "Tes Verbal", ana: "Tes Verbal", der: "Tes Numerik", ari: "Tes Numerik", sil: "Tes Logika", anl: "Tes Logika", epp: "Kepribadian", pap: "Kepribadian", spa: "Spasial" };
const SUB_PG = 60;

function prep(x) { const idx = shuffle([0, 1, 2, 3, 4]); return { k: x.k, d: x.d, t: x.t, o: idx.map(i => x.o[i]), a: idx.indexOf(x.a), e: x.e }; }
function sample(k, n, L) {
  if (n <= 0) return [];
  if (k === "num") {
    const out = [], seen = new Set(); let g = 0;
    while (out.length < n && g++ < 800) {
      const d = Math.max(1, Math.min(3, L + (Math.random() < .3 ? -1 : 0) + (Math.random() < .15 ? 1 : 0)));
      const x = numQ(d); if (seen.has(x.t)) continue; seen.add(x.t); out.push(x);
    }
    const extra = BANK.filter(x => x.k === "num"); // soal numerik tulisan sendiri (jika ada) ikut dicampur
    if (extra.length) out.splice(0, Math.min(extra.length, Math.floor(n / 3)), ...shuffle(extra).slice(0, Math.floor(n / 3)));
    return out.slice(0, n).map(prep);
  }
  return BANK.filter(x => x.k === k)
    .map(x => ({ x, key: Math.pow(Math.random(), 1 / (3 - Math.abs(x.d - L))) }))
    .sort((a, b) => b.key - a.key).slice(0, n).map(o => prep(o.x));
}
function compose(spec, L) { let qs = []; for (const k in spec) qs = qs.concat(sample(k, spec[k], L)); return qs; }

// mode 1 & 2 = latihan (umpan balik per soal), 3 & 4 = CAT (dinilai di akhir)
export function build(mode, cat, tk, limit) {
  const L = TK[tk].lvl;
  if (mode === 5) { // Paket Psikotes Kerja: urut dari mudah ke sulit, 15 soal acak per sesi
    const pool = PBANK.filter(x => x.k === cat), n = 15, out = [];
    for (const d of [1, 2, 3]) out.push(...shuffle(pool.filter(x => x.d === d)).slice(0, Math.ceil(n / 3)));
    if (out.length < n) { const rest = shuffle(pool.filter(x => !out.includes(x))); out.push(...rest.slice(0, n - out.length)); }
    return { kind: "prac", title: "Psikotes · " + PCAT_NAMES[cat], per: 0, qs: out.sort((a, b) => a.d - b.d).slice(0, n).map(prep) };
  }
  if (mode === 1) return { kind: "prac", title: "Tahap 1 · Pemanasan", per: 0, qs: shuffle(compose({ kmk: 2, asn: 2, twk: 2, ver: 2, num: 1, log: 1 }, 1)).slice(0, limit) };
  if (mode === 2) return { kind: "prac", title: "Tahap 2 · " + CAT_NAMES[cat], per: 75, qs: compose({ [cat]: Math.min(10, limit) }, L) };
  const full = mode === 4;
  return {
    kind: "cat", title: full ? "Simulasi CAT" : "Tryout Mini",
    secs: [
      { key: "sub", name: "Tes Substansi Kemenkeu & TWK", dur: (full ? 60 : 20) * 60, qs: compose(full ? { kmk: 25, asn: 15, twk: 20 } : { kmk: 8, asn: 5, twk: 7 }, L) },
      { key: "pot", name: "Tes Potensi", dur: (full ? 45 : 20) * 60, qs: compose(full ? { ver: 15, num: 20, log: 10 } : { ver: 7, num: 8, log: 5 }, L) },
    ],
  };
}

const publicQ = q => ({ k: q.k, t: q.t, o: q.o });
export function publicSession(id, s) {
  if (s.kind === "prac") return { id, kind: s.kind, title: s.title, per: s.per, qs: s.qs.map(publicQ) };
  return { id, kind: s.kind, title: s.title, secs: s.secs.map(x => ({ key: x.key, name: x.name, dur: x.dur, qs: x.qs.map(publicQ) })) };
}
export function scoreSec(sec, ans, tk) {
  const b = sec.qs.reduce((c, q, i) => c + (ans[i] === q.a ? 1 : 0), 0), n = sec.qs.length;
  const val = sec.key === "sub" ? Math.round(b * 100 / n * 100) / 100 : Math.round(b * 600 / n + 200);
  const pg = sec.key === "sub" ? SUB_PG : TK[tk].pg;
  return { key: sec.key, name: sec.name, b, n, val, pg, pass: val >= pg };
}
export function topicStats(qs, ans) {
  const t = {};
  qs.forEach((q, i) => { const p = t[q.k] = t[q.k] || { b: 0, n: 0 }; p.n++; if (ans[i] === q.a) p.b++; });
  return t;
}
