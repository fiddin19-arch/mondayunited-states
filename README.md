# Mondayunited States — versi Cloudflare

Game *social deduction* satir birokrasi Indonesia untuk 6–12 pemain, langsung dari browser HP atau laptop.

Berjalan di **Cloudflare Workers + Durable Objects** (paket gratis):
- Setiap room adalah satu Durable Object yang memegang semua data rahasia. Mesin game jalan di server, jadi **game tetap berjalan walau pembuat room keluar**.
- **Main Cepat / Cari Room**: room publik tampil di daftar (Durable Object `Directory`). Room publik mulai otomatis 60 detik setelah 6 orang; pemegang palu bisa menambah 60 detik (maks. 5x) atau mulai lebih cepat.
- **Room privat**: hanya lewat 4 digit kode, mulai manual. Pemegang palu bisa mengeluarkan pemain di lobi (yang dikeluarkan tidak bisa masuk lagi ke room itu).
- Pemegang palu keluar/putus >15 detik → palu pindah ke pemain yang paling lama hadir.
- Pemain putus di tengah game: bisa masuk lagi lewat link yang sama; kalau >2 menit, autopilot mengambil alih (label AFK) sampai ia kembali.
- Room publik sepi 3 menit → pemegang palu ditawari mengisi kursi kosong dengan bot. Latihan offline melawan bot tetap ada.
- Filter kata kasar di chat & nama, dan tombol bisukan pemain (hanya di HP sendiri).
- **Papan Pemenang** di halaman depan: sidang online terakhir (nama + peran Presiden, faksi pemenang, berita Breaking satir). Tersimpan permanen di Durable Object `Directory` (20 terakhir). Hanya sidang publik dengan minimal 4 pemain manusia yang dicatat, jadi latihan melawan bot tidak masuk. Selama sidang asli belum mencapai 4, sisa barisnya diisi **sidang latihan melawan bot** yang ditandai 🤖 (data sementara di `HALL_SEED` pada `src/worker.js`; kosongkan array itu untuk mematikannya). Entri bot tidak ikut menghitung tren dan otomatis tersisih begitu ada 4 sidang asli. Bila 5+ sidang terakhir banyak dimenangkan Gelap/Reformis, muncul ajakan sesuai tren (tanpa angka statistik).

> **Update dari versi sebelumnya:** ganti `src/worker.js`, `src/engine.js`, `public/index.html`, **dan `wrangler.jsonc`** (ada Durable Object baru `Directory` dengan migrasi `v2`). Tanpa `wrangler.jsonc` baru, daftar room selalu kosong tapi game tetap jalan.

```
├── wrangler.jsonc      ← konfigurasi Cloudflare (nama Worker, Durable Object, folder halaman)
├── package.json
├── src/
│   ├── worker.js       ← Worker + Durable Object "Room" & "Directory" (daftar room publik)
│   └── engine.js       ← mesin aturan permainan
└── public/
    └── index.html      ← aplikasi pemain (semua tampilan dalam satu file)
```

---

## Bagian 1 — Taruh kode di GitHub (lewat browser, tanpa install apa pun)

1. **Buat akun** di [github.com](https://github.com) jika belum punya, lalu login.
2. Klik tombol **+** di kanan atas → **New repository**.
3. Isi:
   - **Repository name:** `mondayunited-states`
   - **Private** atau **Public**: dua-duanya bisa. Pilih *Private* kalau tidak mau kodenya dilihat orang.
   - Jangan centang "Add a README" (README sudah ada di folder ini).
4. Klik **Create repository**.
5. Di halaman repo yang masih kosong, klik tautan **uploading an existing file**.
6. Ekstrak file zip di komputer Anda. Buka folder `mondayunited-states-cloudflare`, pilih **semua isinya** (`src`, `public`, `wrangler.jsonc`, `package.json`, `README.md`, `.gitignore`), lalu seret ke halaman upload GitHub.
   > Yang diseret adalah **isi** foldernya, bukan folder induknya. File `wrangler.jsonc` harus berada di halaman utama repo, bukan di dalam subfolder.
   >
   > File `.gitignore` tersembunyi di Mac/Windows. Kalau tidak ikut terunggah, tidak masalah.
7. Gulir ke bawah, klik **Commit changes**.
8. Cek halaman utama repo. Harus terlihat folder `src`, folder `public`, dan file `wrangler.jsonc`.

<details>
<summary>Cara alternatif lewat terminal (kalau sudah terbiasa dengan git)</summary>

```bash
cd mondayunited-states-cloudflare
git init
git add .
git commit -m "Rilis pertama Mondayunited States"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/mondayunited-states.git
git push -u origin main
```
</details>

---

## Bagian 2 — Deploy ke Cloudflare (otomatis dari GitHub)

1. **Buat akun gratis** di [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up), lalu verifikasi email.
2. Di dashboard, buka menu **Workers & Pages** (di bawah "Compute").
3. Klik **Create application**, lalu **Get started** di samping **Import a repository**.
4. Pilih akun Git → **GitHub**, lalu ikuti proses izin. Saat ditanya repo mana yang boleh diakses, pilih **Only select repositories** → `mondayunited-states` → **Install & Authorize**.
5. Pilih repo `mondayunited-states` dari daftar (bisa pakai kolom pencarian).
6. Di halaman konfigurasi:
   - **Project name:** harus persis `mondayunited-states` (sama dengan `name` di `wrangler.jsonc`). Kalau berbeda, build akan gagal.
   - **Build command:** kosongkan.
   - **Deploy command:** `npx wrangler deploy` (biasanya sudah terisi).
   - **Root directory / Path:** kosongkan (atau `/`).
7. Klik **Save and Deploy**. Tunggu 1–2 menit sampai log build menunjukkan sukses.
8. Alamat game muncul di halaman Worker, bentuknya `https://mondayunited-states.<nama-akun-anda>.workers.dev`.
   > Kalau ini Worker pertama Anda, Cloudflare mungkin meminta Anda memilih nama subdomain `workers.dev` lebih dulu.
9. Buka alamat itu, klik **Buat Room Baru**, lalu bagikan kode 4 digitnya ke teman. Bisa juga bagikan link langsung `https://alamat-anda/#1234`.

### Memperbarui game

Ubah atau unggah ulang file di GitHub (misalnya `public/index.html`), lalu klik **Commit changes**. Cloudflare otomatis membangun dan merilis ulang dalam 1–2 menit.

> Room yang sedang berjalan saat rilis ulang biasanya tersambung kembali sendiri, karena state room disimpan di Durable Object. Tetap saja, sebaiknya rilis ulang saat tidak ada yang main.

### Domain sendiri (opsional)

Kalau Anda punya domain di Cloudflare: buka Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**, lalu isi misalnya `main.domainanda.com`.

---

## Bagian 3 (opsional) — Jalankan atau deploy dari laptop

Butuh [Node.js](https://nodejs.org) versi 18 atau lebih baru.

```bash
npm install            # memasang wrangler
npx wrangler dev       # main lokal di http://localhost:8787
npx wrangler login     # sekali saja, membuka browser untuk login Cloudflare
npx wrangler deploy    # rilis langsung tanpa lewat GitHub
```

---

## Batas paket gratis Cloudflare

| Batas Durable Objects (paket Workers Free) | Artinya untuk game ini |
|---|---|
| 100.000 request per hari | Koneksi dihitung 1 request, dan setiap 20 pesan pemain dihitung 1 request. Satu permainan 8 orang hanya memakai puluhan sampai ratusan request. |
| 13.000 GB-detik durasi per hari | Room aktif (128 MB) bisa hidup total ±28 jam per hari, dijumlah dari semua room. **Ini batas yang paling cepat tersentuh.** |
| 100.000 *rows written* per hari | Room menyimpan state tiap 5 detik saat aktif (±720 per jam). Cukup untuk ±130 jam room aktif. |
| Reset harian | Pukul 00.00 UTC (07.00 WIB) |

Kalau batas harian habis, room baru gagal dibuat sampai reset. Untuk main bareng teman, ini praktis tidak akan tersentuh.

---

## Mengatasi masalah

| Gejala | Penyebab & solusi |
|---|---|
| Build gagal: nama tidak cocok | Nama project di dashboard harus sama persis dengan `"name"` di `wrangler.jsonc` (`mondayunited-states`). Ganti salah satunya agar sama. |
| Build gagal: `wrangler.jsonc` tidak ditemukan | File terunggah di subfolder. Pastikan `wrangler.jsonc` ada di halaman utama repo, atau isi **Root directory** dengan nama subfoldernya. |
| Error tentang Durable Objects / *key-value storage backend* | Konfigurasi sudah memakai `new_sqlite_classes`, yang memang wajib di paket gratis. Pastikan `wrangler.jsonc` tidak diubah di bagian `migrations`. |
| Halaman terbuka tapi "Server tidak bisa dihubungi" saat buat room | Tunggu 1 menit setelah deploy pertama, lalu muat ulang. Cek tab **Logs** di halaman Worker. |
| Teman tidak bisa gabung | Pastikan kode 4 digitnya benar dan sidang belum dimulai. Pemain baru hanya bisa masuk saat lobi. |

---

## Cara main singkat

- Satu orang menekan **Buat Room Baru** dan menjadi pemegang palu: mengatur role dan timer, menambah bot kalau pemain kurang dari 6, lalu memulai.
- **Faksi Gelap** (Koruptor, Broker, Buzzer) menang jika semua Reformis dipenjara, Koruptor terpilih Presiden 3 kali (kumulatif), atau permainan mencapai hari ke-20.
- Broker bisa merekrut satu Warga Sipil menjadi **Buzzer**.
- Napi yang dibebaskan Presiden (dari faksi mana pun) kehilangan role-nya dan menjadi **Warga Sipil biasa** (Reformis).
- Pemakzulan pertama hanya peringatan (tidak boleh ikut pemilu kilat yang sama). Pemakzulan **kedua** membuat Presiden **cacat politik permanen**. Jika tidak ada kandidat sama sekali, sistem mengundi **Plt. Presiden** untuk 1 putaran tanpa Hak Veto. Jika semua Koruptor dipenjara, tidak ada lagi fitnah: sisa Faksi Gelap hanya bisa mengulur waktu.
- **Reformis** (KPK, Jurnalis, Pengamat Politik, Guru Besar, Warga Sipil) menang jika semua anggota Faksi Gelap dipenjara.
- Presiden dipilih dari 2 kandidat acak, menjabat 2 putaran, imun dari fitnah dan rekrut, dan memutuskan apakah tuduhan sah.
- KPK bisa **Sadap** (tahu faksi) atau **OTT** (target jadi Tersangka, siapa pun dia; berkasnya tampil sama dengan tuduhan Koruptor).
- Koruptor menulis **Berita Jelek** (fitnah) atau **Berita Bagus** (pencitraan: target kebal OTT malam itu). Jurnalis membatalkan berita Koruptor apa pun pada target yang ia cek.
- Jika KPK dipenjara (atau kehilangan role karena dibebaskan), satu Warga Sipil bebas diam-diam diangkat menjadi **KPK pengganti**.
- Halaman depan juga punya mode **latihan solo** melawan bot.
