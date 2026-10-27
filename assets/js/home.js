'use strict';
(async()=>{
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 document.body.classList.toggle('no-motion',V.store.get('motion')==='false');
 const [data,cast]=await Promise.all([V.json('data/chapters.json'),V.json('data/characters.json')]);
 document.querySelector('#chapterGrid').innerHTML=data.bab.map(c=>`<a class="chapter-card" href="baca.html?bab=${esc(c.id)}"><img src="${esc(c.gambar)}" alt="" loading="lazy"><div><span class="eyebrow">${esc(c.label)} · ${esc(c.tahun)}</span><h3>${esc(c.judul)}</h3><p>${esc(c.ringkasan)}</p><small>${c.kata.toLocaleString('id-ID')} kata · Buka kisah →</small></div></a>`).join('');
 document.querySelector('#homeCast').innerHTML=cast.prolog.map(c=>`<details class="cast-card"><summary><span role="img" aria-label="Potret ${esc(c.nama)}" class="portrait" style="background-image:url(${esc(c.gambar)});background-size:${esc(c.ukuran)};background-position:${esc(c.posisi)}"></span><strong>${esc(c.nama)}</strong><small>${esc(c.peran)} · Buka kisah ↓</small></summary><p>${esc(c.teks)}</p></details>`).join('');
 const last=data.bab.find(c=>c.id===V.store.get('lastChapter'));if(last){document.querySelector('#continue').href='baca.html?bab='+last.id;document.querySelector('#continue').textContent='Lanjutkan '+last.label+' →';}
})().catch(()=>{document.querySelector('#chapterGrid').innerHTML='<p>Bacaan dapat dibuka langsung melalui <a href="baca.html?bab=prolog">Prolog</a> atau <a href="baca.html?bab=bab-1">Bab 1</a>.</p>';});
