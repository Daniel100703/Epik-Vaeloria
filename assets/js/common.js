'use strict';
// Alat bersama beranda & ruang baca. Tanpa pustaka luar, tanpa proses build.
const V = {
  $: s => document.querySelector(s),
  store: {
    get(k){ try { return localStorage.getItem('vaeloria.' + k); } catch { return null; } },
    set(k, v){ try { localStorage.setItem('vaeloria.' + k, v); return true; } catch { return false; } }
  },
  async json(path){
    const r = await fetch(path, {cache: 'no-cache'});
    if (!r.ok) throw new Error('Gagal memuat ' + path);
    return r.json();
  },
  // Nomor bab tertinggi yang pernah dibuka pembaca (penentu kodeks yang boleh tampil).
  progress(){ const n = Number(V.store.get('terbaca')); return Number.isFinite(n) ? n : 0; },
  markRead(n){ if (n > V.progress()) V.store.set('terbaca', String(n)); },
  // Teks kodeks sesuai tahap yang sudah terbuka; null bila entri belum boleh tampil.
  codexText(e, upTo){
    if (e.buka > upTo) return null;
    const open = (e.tahap || []).filter(t => t.buka <= upTo);
    return open.length ? open[open.length - 1].teks : '';
  },
  toast(msg){
    let t = V.$('.toast'); if (!t){ t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role','status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(V._tt); V._tt = setTimeout(() => t.classList.remove('on'), 2800);
  },
  dialog(title, role, body){
    let d = V.$('#codexDialog');
    if (!d){
      d = document.createElement('dialog'); d.id = 'codexDialog';
      d.innerHTML = '<button class="dialog-close" aria-label="Tutup">×</button><div class="eyebrow"></div><h2></h2><p></p>';
      d.querySelector('.dialog-close').onclick = () => d.close();
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      document.body.append(d);
    }
    d.querySelector('.eyebrow').textContent = role;
    d.querySelector('h2').textContent = title;
    d.querySelector('p').textContent = body;
    d.showModal();
  }
};
