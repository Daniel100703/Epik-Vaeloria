'use strict';
/* Adaptasi reader.js pada templat Vaeloria dan paginate/show/turn dari
   Contoh_Mode_Buku_Dongeng.html. Satu naskah; dua cara menampilkan teksnya. */
const Reader = (() => {
 const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const wide=()=>matchMedia('(min-width:821px) and (orientation:landscape)').matches;
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches||document.body.classList.contains('no-motion');
 const state={chapters:[],chapter:null,story:null,pages:[],i:0,busy:false,mode:'buku',anchor:0,auto:false,timer:0,frame:0,token:0,cue:0,font:18,speed:180,volume:.3,wanted:true,engine:null};
 const getJSON=(k,fallback)=>{try{return JSON.parse(V.store.get(k))??fallback;}catch{return fallback;}};
 let scrollFrame=0,cueTimer=0,cueCandidate=-1,resizeTimer=0,autoStamp=0,scrollPosition=0;
 function parse(md){
  const lines=md.split(/\r?\n/),story={title:'',place:'',epigraph:'',source:'',scenes:[],words:0};let scene=null,para=[];
  const flush=()=>{if(!para.length)return;if(scene){const text=para.join(' '),words=text.split(/\s+/);scene.blocks.push({text,words,start:story.words,id:'p'+story.words});story.words+=words.length;}para=[];};
  for(const raw of lines){const l=raw.trim();
   if(l.startsWith('# ')){story.title=l.slice(2);continue;}
   if(/^\*[^*].*\*$/.test(l)&&!scene){story.place=l.slice(1,-1);continue;}
   if(l.startsWith('>')){const q=l.slice(1).trim();if(q.startsWith('—'))story.source=q;else if(q)story.epigraph+=(story.epigraph?' ':'')+q;continue;}
   const cue=l.match(/^:::\s*adegan\s+([\w-]+)(?:\s+\[?([\w-]+)\]?)?/);
   if(cue){flush();scene={index:story.scenes.length,mood:cue[1],motif:cue[2]||null,blocks:[]};story.scenes.push(scene);continue;}
   if(l===':::'){flush();scene=null;continue;}
   if(!l||l==='✦ ✦ ✦'){flush();continue;}
   if(scene)para.push(l);
  }flush();return story;
 }
 function titleHTML(cls='chapter-heading'){
  return `<header class="${cls}"><div class="eyebrow">${esc(state.chapter.label)} · EPIK VAELORIA</div><h1>${esc(state.chapter.judul)}</h1><div class="chapter-place">${esc(state.story.place)}</div><blockquote>${esc(state.story.epigraph)}<cite>${esc(state.story.source)}</cite></blockquote></header>`;
 }
 function artFor(scene){return state.chapter.seni[Math.min(scene,state.chapter.seni.length-1)];}
 function artHTML(scene,title=false){const a=artFor(scene),src='assets/img/'+a.gambar;return `<figure class="art ${title?'title-art':''}" data-art="${esc(src)}" data-effect="${esc(a.efek)}" style="--focus:${esc(a.fokus)}" tabindex="0" role="button" aria-label="Perbesar ilustrasi: ${esc(a.caption)}"><img src="${esc(src)}" alt="${esc(a.caption)}" decoding="async"><span class="zoom-hint" aria-hidden="true">⤢</span>${title?`<div class="art-heading"><div class="eyebrow">${esc(state.chapter.label)} · EPIK VAELORIA</div><h1>${esc(state.chapter.judul)}</h1><div class="chapter-place">${esc(state.story.place)}</div><blockquote>${esc(state.story.epigraph)}<cite>${esc(state.story.source)}</cite></blockquote></div>`:''}<figcaption>${esc(a.caption)}</figcaption></figure>`;}
 function paragraph(b,from=0,to=b.words.length,first=false){const text=b.words.slice(from,to).join(' ');return `<p data-par="${b.id}" data-start="${b.start+from}" data-end="${b.start+to}" class="${first?'first ':''}${from?'continued ':''}${text.startsWith('“')?'dialogue':''}">${esc(text)}</p>`;}
 function renderScroll(){
  let out=titleHTML(),lastArt=null;
  for(const sc of state.story.scenes){out+=`<section class="scene" data-scene="${sc.index}" data-mood="${esc(sc.mood)}">`;if(sc.index)out+='<p class="orn" aria-hidden="true">✦ ✦ ✦</p>';
   const a=artFor(sc.index),changed=a.gambar!==lastArt;let cap=sc.index===0||changed;
   if(sc.index&&changed){out+=artHTML(sc.index);lastArt=a.gambar;}
   sc.blocks.forEach((b,i)=>{out+=paragraph(b,0,b.words.length,cap);cap=false;if(sc.index===0&&i===state.chapter.pembuka-1){out+=artHTML(0);lastArt=a.gambar;cap=true;}});out+='</section>';
  }
  const next=state.chapters[state.chapters.findIndex(c=>c.id===state.chapter.id)+1];out+=`<div class="chapter-end"><p>✦ ✦ ✦</p>${next?`<a href="baca.html?bab=${encodeURIComponent(next.id)}">${esc(next.label)} — ${esc(next.judul)} →</a>`:'<p>Akhir Bab 1</p><a href="index.html">Kembali ke beranda</a>'}</div>`;$('#scrollReader').innerHTML=out;
 }
 /* Probe memakai ukuran halaman sebelum transformasi 3D. Sisa paragraf dipaginasi berulang,
    termasuk paragraf yang lebih panjang dari dua halaman. Tidak ada pemotongan teks. */
 function paginate(){
  const isWide=wide(),ref=$(isWide?'#R':'#L'),box={width:ref.clientWidth,height:ref.clientHeight};if(!box.width||!box.height)return [];
  const probe=document.createElement('div');probe.className='page pagination-probe';Object.assign(probe.style,{position:'fixed',top:'-20000px',left:'0',width:box.width+'px',height:box.height+'px',visibility:'hidden',pointerEvents:'none'});document.body.append(probe);
  const text=document.createElement('div');text.className='text';probe.append(text);const textPages=[];let cur,firstChapter=true,lastArt=null;
  const newPage=sc=>{text.innerHTML='';cur={type:'text',scene:sc.index,parts:[],start:Infinity,end:0,html:''};if(firstChapter&&!isWide){text.innerHTML=titleHTML('mobile-title');cur.title=true;}firstChapter=false;textPages.push(cur);};
  const fits=()=>text.scrollHeight<=text.clientHeight+1;
  const addPart=(b,from,to,cap)=>{text.insertAdjacentHTML('beforeend',paragraph(b,from,to,cap));cur.parts.push({id:b.id,start:b.start+from,end:b.start+to,text:b.words.slice(from,to).join(' ')});cur.start=Math.min(cur.start,b.start+from);cur.end=b.start+to;cur.html=text.innerHTML;};
  try{for(const sc of state.story.scenes){newPage(sc);if(sc.index)text.innerHTML+='<p class="orn" aria-hidden="true">✦ ✦ ✦</p>';const changed=artFor(sc.index).gambar!==lastArt;let cap=sc.index===0||changed;lastArt=artFor(sc.index).gambar;
    for(const b of sc.blocks){let from=0;
     while(from<b.words.length){const remaining=b.words.length-from,canCap=cap&&from===0;
      text.insertAdjacentHTML('beforeend',paragraph(b,from,b.words.length,canCap));const fullFits=fits();text.lastElementChild.remove();
      if(fullFits){addPart(b,from,b.words.length,canCap);from=b.words.length;cap=false;continue;}
      let lo=0,hi=remaining;
      while(lo<hi){const mid=Math.ceil((lo+hi)/2);text.insertAdjacentHTML('beforeend',paragraph(b,from,from+mid,canCap));const ok=fits();text.lastElementChild.remove();if(ok)lo=mid;else hi=mid-1;}
      // Pindahkan paragraf baru bila hanya tersisa ruang kurang dari empat kata.
      if(lo<4&&cur.parts.length){newPage(sc);continue;}
      if(lo===0){if(cur.title){cur.html=text.innerHTML;cur.start=b.start+from;cur.end=cur.start;newPage(sc);continue;}throw Error('Ukuran halaman terlalu kecil untuk teks.');}
      addPart(b,from,from+lo,canCap);from+=lo;cap=false;if(from<b.words.length)newPage(sc);
     }
    }
   }}finally{probe.remove();}
  // Pastikan seluruh teks muncul tepat sekali dan tetap berurutan.
  const original=state.story.scenes.flatMap(s=>s.blocks.map(b=>b.text)).join(' '), paged=textPages.flatMap(p=>p.parts.map(x=>x.text)).join(' ');
  if(original!==paged)throw Error('Paginasi belum memuat seluruh naskah.');
  document.body.dataset.totalWords=state.story.words;document.body.dataset.pagedWords=paged.split(/\s+/).length;const pages=[];let lastMobileArt=null;
  for(const p of textPages){if(isWide){pages.push({type:'img',scene:p.scene,title:pages.length===0,start:p.start,end:p.start});pages.push(p);}else{const image=artFor(p.scene).gambar;if(image!==lastMobileArt){pages.push({type:'img',scene:p.scene,title:pages.length===0,start:p.start,end:p.start});lastMobileArt=image;}pages.push(p);}}
  return pages;
 }
 function pageHTML(pg,n){if(!pg)return '';if(pg.type==='img')return artHTML(pg.scene,pg.title)+`<div class="folio" style="color:#ead4a5;z-index:3;bottom:9px">${n}</div>`;
  return `<div class="page-running">${esc(state.chapter.label)} · ${esc(state.chapter.judul)}</div><div class="text">${pg.html}</div><div class="folio">${n}</div>`;
 }
 function pageAt(anchor){let n=state.pages.findIndex(p=>p.type==='text'&&p.start<=anchor&&p.end>anchor);if(n<0)n=state.pages.findIndex(p=>p.type==='text');if(n<0)n=0;if(wide()&&n%2)n--;return n;}
 function show(){const p=state.pages[state.i];if(!p)return;$('#L').innerHTML=pageHTML(p,state.i+1);$('#R').innerHTML=wide()?pageHTML(state.pages[state.i+1],state.i+2):'';
  $('#pagePosition').textContent=`${state.i+1}${wide()?'–'+Math.min(state.i+2,state.pages.length):''} / ${state.pages.length}`;$('#prev').disabled=state.i===0;$('#next').disabled=state.i+(wide()?2:1)>=state.pages.length;
  const text=wide()?state.pages[state.i+1]:p;state.anchor=Number.isFinite(text?.start)?text.start:0;setCue(p.scene);savePosition();updateProgress();
 }
 function cancelFlip(){clearTimeout(state.flipTimer);state.busy=false;document.querySelectorAll('.leaf').forEach(e=>e.remove());}
 /* Feuillet 3D recto/verso, issu de turn() dans le fichier d’exemple. */
 function turn(dir,automatic=false){const step=wide()?2:1,j=state.i+dir*step;if(state.busy||j<0||j>=state.pages.length){if(automatic)stopAuto();return;}if(!automatic)stopAuto();
  if(reduced()){state.i=j;show();if(automatic)schedulePage();return;}
  const w=wide(),book=$('#spread');state.busy=true;const leaf=document.createElement('div');leaf.className='leaf '+(dir>0?'fwd':'back');leaf.innerHTML=`<div class="face page ${dir>0?'right':'left'} a"></div><div class="face page ${dir>0?'left':'right'} b"></div>`;
  if(w){leaf.querySelector('.a').innerHTML=dir>0?pageHTML(state.pages[state.i+1],state.i+2):pageHTML(state.pages[state.i],state.i+1);leaf.querySelector('.b').innerHTML=dir>0?pageHTML(state.pages[j],j+1):pageHTML(state.pages[j+1],j+2);$(dir>0?'#R':'#L').innerHTML=pageHTML(state.pages[dir>0?j+1:j],dir>0?j+2:j+1);}
  else{leaf.querySelector('.a').innerHTML=pageHTML(state.pages[dir>0?state.i:j],(dir>0?state.i:j)+1);leaf.querySelector('.b').style.background='var(--paper)';$('#L').innerHTML=pageHTML(state.pages[j],j+1);if(dir<0)leaf.classList.add('turn');}
  book.append(leaf);requestAnimationFrame(()=>requestAnimationFrame(()=>leaf.classList.toggle('turn',!(!w&&dir<0))));
  state.flipTimer=setTimeout(()=>{leaf.remove();state.i=j;state.busy=false;show();if(automatic)schedulePage();},880);
 }
 function build(anchor=state.anchor){cancelFlip();state.pages=paginate();state.i=pageAt(anchor);show();}
 function scrollAnchor(){const ps=[...$('#scrollReader').querySelectorAll('p[data-start]')],line=innerHeight*.32;let p=ps.find(p=>{const r=p.getBoundingClientRect();return r.top<=line&&r.bottom>line;})||ps.find(p=>p.getBoundingClientRect().top>=line)||ps.at(-1);if(p)state.anchor=Number(p.dataset.start);}
 function scrollToAnchor(anchor){const ps=[...$('#scrollReader').querySelectorAll('p[data-start]')],p=ps.find(p=>Number(p.dataset.start)<=anchor&&Number(p.dataset.end)>anchor)||ps[0];if(p){cueCandidate=Number(p.closest('[data-scene]').dataset.scene);clearTimeout(cueTimer);setCue(cueCandidate);}if(anchor<=0){window.scrollTo(0,0);return;}if(p){const bar=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar'))||64;window.scrollTo(0,p.getBoundingClientRect().top+scrollY-bar-20);}}
 function savePosition(){if(!state.chapter)return;V.store.set('position:'+state.chapter.id,JSON.stringify({anchor:state.anchor,mode:state.mode}));V.store.set('lastChapter',state.chapter.id);}
 function updateProgress(){const end=state.mode==='buku'?(state.pages[state.i+(wide()?1:0)]?.end||state.anchor):state.anchor;const percent=Math.min(100,Math.round(end/state.story.words*100));$('#progressText').textContent=percent+'%';$('#progressBar').style.width=percent+'%';}
 function setMode(mode,capture=true){if(!state.story)return;if(capture&&state.mode==='gulir'&&!$('#scrollReader').hidden)scrollAnchor();stopAuto();cancelFlip();state.mode=mode;document.body.dataset.mode=mode;$('#scrollReader').hidden=mode!=='gulir';$('#bookReader').hidden=mode!=='buku';$('#modeBook').setAttribute('aria-pressed',mode==='buku');$('#modeScroll').setAttribute('aria-pressed',mode==='gulir');V.store.set('mode',mode);
  if(mode==='buku'){window.scrollTo(0,0);build();}else{requestAnimationFrame(()=>{scrollToAnchor(state.anchor);queueScroll();});}savePosition();
 }
 function queueScroll(){if(state.mode!=='gulir'||scrollFrame||!state.story)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;scrollAnchor();savePosition();updateProgress();const line=innerHeight*.38,sc=[...$('.scroll-reader').querySelectorAll('[data-scene]')].find(s=>{const r=s.getBoundingClientRect();return r.top<=line&&r.bottom>=line;});if(sc&&Number(sc.dataset.scene)!==cueCandidate){cueCandidate=Number(sc.dataset.scene);clearTimeout(cueTimer);cueTimer=setTimeout(()=>setCue(cueCandidate),180);}});}
 function setCue(n){state.cue=n;document.body.dataset.scene=n;if(!state.engine||$('#musicDialog').open)return;const sc=state.story?.scenes[n];if(!sc)return;const key=sc.motif&&state.engine.catalog.motifs[sc.motif]?sc.motif:sc.mood;state.engine.choose(key);musicLabel();}
 function musicLabel(){const e=state.engine;document.body.dataset.audio=e?.playing&&e?.ctx?.state==='running'?'playing':'paused';document.body.dataset.track=e?.key||'';$('#musicToggle').setAttribute('aria-pressed',state.wanted);$('#musicToggle').setAttribute('aria-label','Musik '+(state.wanted?'nyala':'mati'));$('#musicToggle').innerHTML=`${state.wanted?'♪':'♩'} <span>Musik ${state.wanted?'nyala':'mati'}</span>`;
  $('#musicState').textContent=!state.wanted?'Musik mati':!e?.playing?'Musik siap · sentuh untuk mulai':e.ctx?.state!=='running'?'Musik menunggu halaman aktif':state.volume===0?'Volume musik 0%':'♪ '+(e.score(e.key).title||e.score(e.key).name);
 }
 async function unlock(e){if(!state.wanted||!state.engine||state.engine.playing)return;if(e&&e.type==='keydown'&&['Shift','Control','Alt','Meta'].includes(e.key))return;try{await state.engine.play();musicLabel();}catch{musicLabel();}}
 function stopAuto(){state.auto=false;clearTimeout(state.timer);cancelAnimationFrame(state.frame);state.frame=0;$('#autoRead').setAttribute('aria-pressed','false');$('#autoRead').textContent='▷ Baca otomatis';}
 function schedulePage(){if(!state.auto||state.mode!=='buku')return;clearTimeout(state.timer);const p=state.pages[state.i+(wide()?1:0)];const words=p?.type==='text'?p.end-p.start:25;state.timer=setTimeout(()=>{if(state.i+(wide()?2:1)>=state.pages.length){stopAuto();V.toast('Akhir bacaan.');}else turn(1,true);},Math.max(5000,words*60000/state.speed));}
 function autoScroll(t){if(!state.auto||state.mode!=='gulir')return;const dt=Math.min(60,t-autoStamp||0);autoStamp=t;const el=$('#scrollReader'),style=getComputedStyle(el),line=parseFloat(style.lineHeight),fs=parseFloat(style.fontSize),width=el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),wordsPerLine=Math.max(4,width/(fs*.5*6));scrollPosition+=state.speed/60/wordsPerLine*line*dt/1000;window.scrollTo(0,scrollPosition);if(scrollY+innerHeight>=document.documentElement.scrollHeight-3){stopAuto();V.toast('Akhir bacaan.');return;}state.frame=requestAnimationFrame(autoScroll);}
 function startAuto(){if(!state.story)return;if(state.auto){stopAuto();return;}state.auto=true;$('#autoRead').setAttribute('aria-pressed','true');$('#autoRead').textContent='Ⅱ Jeda baca';if(state.mode==='buku')schedulePage();else{autoStamp=performance.now();scrollPosition=scrollY;state.frame=requestAnimationFrame(autoScroll);}}
 function openDialog(id){stopAuto();$('#'+id).showModal();}
 function bindArtwork(){document.addEventListener('click',e=>{const art=e.target.closest('[data-art]');if(!art)return;stopAuto();$('#artFull').src=art.dataset.art;$('#artFull').alt=art.querySelector('img').alt;$('#artCaption').textContent=art.querySelector('figcaption').textContent;$('#artDialog').showModal();});document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-art]')){e.preventDefault();e.target.click();}});
  document.addEventListener('pointermove',e=>{if(reduced()||e.pointerType==='touch')return;const art=e.target.closest('[data-art]');if(!art)return;const r=art.getBoundingClientRect();art.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5)*7+'px');art.style.setProperty('--my',((e.clientY-r.top)/r.height-.5)*5+'px');},{passive:true});
 }
 function castHTML(c){return c.map(x=>`<details class="cast-card"><summary><span role="img" aria-label="Potret ${esc(x.nama)}" class="portrait" style="background-image:url(${esc(x.gambar)});background-size:${esc(x.ukuran)};background-position:${esc(x.posisi)}"></span><strong>${esc(x.nama)}</strong><small>${esc(x.peran)} · Buka kisah ↓</small></summary><p>${esc(x.teks)}</p></details>`).join('');}
 function renderCast(){const c=state.cast[state.chapter.id]||[];$('#castGrid').innerHTML=castHTML(c);}
 async function loadChapter(id,initial=false){stopAuto();const token=++state.token;$('#loadState').hidden=false;const chapter=state.chapters.find(c=>c.id===id)||state.chapters[0];const r=await fetch(chapter.file,{cache:'no-cache'});if(!r.ok)throw Error('Naskah belum dapat dimuat.');const md=await r.text();if(token!==state.token)return;state.chapter=chapter;state.story=parse(md);state.cue=0;state.anchor=getJSON('position:'+chapter.id,{anchor:0}).anchor||0;state.pages=[];document.title=chapter.label+' — '+chapter.judul+' | Epik Vaeloria';$('#chapterSelect').value=chapter.id;renderScroll();renderCast();setCue(0);$('#loadState').hidden=true;V.markRead(chapter.nomor);const url=new URL(location.href);url.searchParams.set('bab',chapter.id);if(!initial)history.pushState({chapter:chapter.id},'',url);cueCandidate=-1;setMode(state.mode,false);}
 async function init(){
  const savedFont=Number(V.store.get('font'));state.font=savedFont>=16&&savedFont<=24?savedFont:(wide()?18:17);state.speed=Number(V.store.get('speed'))||180;state.volume=Math.max(0,Math.min(.65,Number(V.store.get('volume')??.3)));state.wanted=V.store.get('musik')!=='false';state.mode=V.store.get('mode')==='gulir'?'gulir':'buku';document.documentElement.style.setProperty('--fs',state.font+'px');document.body.classList.toggle('no-motion',V.store.get('motion')==='false');
  $('#fontSize').value=state.font;$('#fontValue').textContent=state.font+' px';$('#volume').value=state.volume*100;$('#volumeValue').textContent=Math.round(state.volume*100)+'%';$('#speed').value=state.speed;$('#speedValue').textContent=state.speed+' kata/menit';$('#motionToggle').checked=!reduced();
  const [chapters,catalog,cast]=await Promise.all([V.json('data/chapters.json'),V.json('data/music-studio.json'),V.json('data/characters.json')]);state.chapters=chapters.bab;state.cast=cast;state.engine=new VaeloriaScore(catalog,musicLabel);state.engine.setVolume(state.volume);$('#chapterSelect').innerHTML=state.chapters.map(c=>`<option value="${esc(c.id)}">${esc(c.label)} · ${esc(c.judul)}</option>`).join('');
  ['pointerdown','touchstart','keydown'].forEach(name=>addEventListener(name,unlock,{passive:true,capture:true}));
  $('#musicToggle').onclick=()=>{state.wanted=!state.wanted;V.store.set('musik',String(state.wanted));if(state.wanted)unlock();else state.engine.pause();musicLabel();};
  $('#modeBook').onclick=()=>setMode('buku');$('#modeScroll').onclick=()=>setMode('gulir');$('#chapterSelect').onchange=e=>loadChapter(e.target.value).catch(fail);$('#prev').onclick=()=>turn(-1);$('#next').onclick=()=>turn(1);$('#autoRead').onclick=startAuto;
  $('#settingsButton').onclick=()=>openDialog('settingsDialog');$('#castButton').onclick=()=>openDialog('castDialog');$('#musicRoom').onclick=()=>{$('#settingsDialog').close();openDialog('musicDialog');};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
  $('#musicDialog').addEventListener('close',()=>setCue(state.cue));$('#musicGrid').innerHTML=Object.entries({...catalog.moods,...catalog.motifs}).map(([key,m])=>`<button data-track="${esc(key)}" aria-pressed="false">${esc(m.title||m.name)}<small>${esc(m.description)}</small></button>`).join('');$('#musicGrid').onclick=e=>{const b=e.target.closest('[data-track]');if(!b)return;state.engine.choose(b.dataset.track);state.wanted=true;V.store.set('musik','true');unlock();$('#musicGrid').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));musicLabel();};
  $('#fontSize').oninput=e=>{stopAuto();if(state.mode==='gulir')scrollAnchor();state.font=Number(e.target.value);document.documentElement.style.setProperty('--fs',state.font+'px');$('#fontValue').textContent=state.font+' px';V.store.set('font',state.font);if(state.mode==='buku')build();else scrollToAnchor(state.anchor);};
  $('#volume').oninput=e=>{state.volume=Number(e.target.value)/100;state.engine.setVolume(state.volume);V.store.set('volume',state.volume);$('#volumeValue').textContent=e.target.value+'%';musicLabel();};$('#speed').oninput=e=>{state.speed=Number(e.target.value);V.store.set('speed',state.speed);$('#speedValue').textContent=state.speed+' kata/menit';if(state.auto&&state.mode==='buku')schedulePage();};
  $('#motionToggle').onchange=e=>{document.body.classList.toggle('no-motion',!e.target.checked);V.store.set('motion',String(e.target.checked));};
  $('#bookmark').onclick=()=>{if(state.mode==='gulir')scrollAnchor();V.store.set('bookmark:'+state.chapter.id,JSON.stringify({anchor:state.anchor}));V.toast('Penanda bacaan disimpan.');};
  $('#restoreBookmark').onclick=()=>{const b=getJSON('bookmark:'+state.chapter.id,null);if(!b){V.toast('Belum ada penanda untuk bab ini.');return;}state.anchor=b.anchor;$('#settingsDialog').close();if(state.mode==='buku'){state.i=pageAt(state.anchor);show();}else scrollToAnchor(state.anchor);};$('#restartChapter').onclick=()=>{state.anchor=0;$('#settingsDialog').close();if(state.mode==='buku'){state.i=pageAt(0);show();}else scrollToAnchor(0);};
  addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(state.mode==='buku'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}if(e.key==='Escape')stopAuto();});
  let gesture=null,suppressArt=false;
  $('#book').addEventListener('pointerdown',e=>{if(e.button===0)gesture={x:e.clientX,y:e.clientY};},{passive:true});
  $('#book').addEventListener('pointerup',e=>{if(!gesture)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){suppressArt=true;turn(dx<0?1:-1);setTimeout(()=>suppressArt=false,100);}});
  $('#book').addEventListener('pointercancel',()=>gesture=null);
  $('#book').addEventListener('click',e=>{if(suppressArt){e.stopPropagation();e.preventDefault();}},true);

  addEventListener('scroll',queueScroll,{passive:true});addEventListener('wheel',()=>{if(state.auto)stopAuto();},{passive:true});addEventListener('touchmove',()=>{if(state.auto&&state.mode==='gulir')stopAuto();},{passive:true});
  addEventListener('resize',()=>{clearTimeout(resizeTimer);stopAuto();resizeTimer=setTimeout(()=>{if(state.mode==='buku')build();else queueScroll();},180);});
  addEventListener('popstate',()=>loadChapter(new URLSearchParams(location.search).get('bab'),true).catch(fail));
  document.addEventListener('visibilitychange',async()=>{stopAuto();if(document.hidden)await state.engine.suspendHidden();else await state.engine.resumeVisible().catch(()=>{});musicLabel();});
  bindArtwork();await document.fonts.ready;await loadChapter(new URLSearchParams(location.search).get('bab'),true);musicLabel();if(location.hash==='#musik')openDialog('musicDialog');
 }
 function fail(err){console.error(err);$('#loadState').hidden=false;$('#loadState').textContent='Bacaan belum dapat dibuka. Muat ulang halaman untuk mencoba kembali.';}
 init().catch(fail);
 // Diagnostic non-mutating: verifies complete text and page-fit during browser QA.
 return {snapshot:()=>({chapter:state.chapter?.id,mode:state.mode,index:state.i,pages:state.pages.length,words:state.story?.words,pagedWords:state.pages.filter(p=>p.type==='text').reduce((n,p)=>n+p.parts.reduce((m,x)=>m+x.text.split(/\s+/).length,0),0),anchor:state.anchor,auto:state.auto,busy:state.busy,cue:state.cue,music:state.engine?{key:state.engine.key,playing:state.engine.playing,context:state.engine.ctx?.state,volume:state.engine.volume}:null,overflow:[...document.querySelectorAll('#spread > .page .text')].filter(e=>e.getBoundingClientRect().width).some(e=>e.scrollHeight>e.clientHeight+1)})};
})();
