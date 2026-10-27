# Epik Vaeloria

Situs novel statis. Beranda: `index.html`. Semua bab dibaca melalui `baca.html?bab=<id>`.

- `chapters/*.md`: satu sumber naskah, termasuk epigraf dan penanda musik tersembunyi.
- `data/chapters.json`: daftar bab dan ilustrasi per adegan.
- `data/characters.json`: kartu tokoh pembaca.
- `data/music-studio.json` dan `assets/js/vaeloria-score.js`: iringan musik prosedural.
- `assets/js/reader.js`: parsing, mode gulir, paginasi, penanda, dan sinkronisasi musik.
- `assets/css/storybook.css`: dasar dari `Contoh_Mode_Buku_Dongeng.html` milik penulis. Daun 3D dan probe paginasi diadaptasi dari contoh tersebut.
- `assets/css/style.css`: meja, sampul kulit, perkamen, ilustrasi, dan tata letak responsif.

`dashboard.html`, `bab-01.html`, dan `musik.html` mengarahkan alamat lama ke pembaca yang sama. Tidak ada salinan naskah dalam HTML.

## Bentuk naskah

Judul, tempat/waktu, epigraf bersumber, lalu prosa. Satu POV orang ketiga terbatas per bab. Penanda `::: adegan suasana [motif]` tidak tampil kepada pembaca. Pemisah adegan menggunakan `✦ ✦ ✦`. Tambahkan bab melalui Markdown dan satu entri daftar bab; tidak perlu menyalin halaman HTML.

## Pemeriksaan 27 Oktober 2026

- Prolog: 2.742 kata naratif; Bab 1: 3.119 kata naratif.
- Chromium desktop 1363 × 936: seluruh 23 bentang Prolog dan 26 bentang Bab 1, tidak ada luapan teks. Teks Prolog yang dikumpulkan dari halaman identik dengan sumber pembaca.
- Viewport ponsel 390 × 844: seluruh Prolog lengkap, 2.742 kata, tanpa luapan.
- Viewport 360 × 640: awal Bab 1 dan ukuran tulisan 24 px tetap memuat cerita tanpa luapan.
- Tombol/panah, gestur penunjuk horizontal, baca otomatis buku/gulir, penanda, zoom ilustrasi, mode tanpa gerak, perubahan bab, serta mulai audio dan pergantian cue diperiksa lewat UI.
- Paginasi juga membandingkan gabungan seluruh potongan dengan naskah sebelum menampilkan buku.

Pengujian ponsel memakai viewport iframe di Chromium. Safari/iOS, Android fisik, sentuhan perangkat fisik, dan kualitas suara melalui pengeras suara belum diuji. Preferensi sistem `prefers-reduced-motion` ditangani melalui CSS dan JavaScript; yang diuji lewat UI adalah opsi tanpa gerak aplikasi.
