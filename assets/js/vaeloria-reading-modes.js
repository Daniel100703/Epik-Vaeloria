/* Two reading layouts with explicit, cancellable automatic reading. */
(function(global){
"use strict";
class VaeloriaReadingModes{
 constructor({state,reader,viewport,shell,onChange=()=>{}}){
  this.state=state;this.reader=reader;this.viewport=viewport;this.shell=shell;this.onChange=onChange;
  this.mode=state.data.readMode;this.active=false;this.page=0;this.total=1;this.visible=1;this.step=1;
  this.running=false;this.frame=0;this.elapsed=0;this.lastTime=0;this.layoutTimer=0;this.pointer=null;this.layoutWidth=0;
  this.scenes=[...reader.querySelectorAll(".scene")];
  this.el=id=>document.getElementById(id);
  this.tick=this.tick.bind(this);
  this.el("mode-scroll").addEventListener("click",()=>this.setMode("scroll"));
  this.el("mode-book").addEventListener("click",()=>this.setMode("book"));
  this.el("auto-read").addEventListener("click",()=>this.running?this.stop("Baca otomatis dijeda."):this.start());
  this.el("auto-stop").addEventListener("click",()=>{this.stop("Baca otomatis dijeda.");this.viewport.focus({preventScroll:true});});
  this.el("read-speed").addEventListener("input",e=>{state.set("readSpeed",Number(e.target.value));this.elapsed=0;this.controls();});
  this.el("page-prev").addEventListener("click",()=>this.turn(-1,true));
  this.el("page-next").addEventListener("click",()=>this.turn(1,true));
  viewport.addEventListener("pointerdown",e=>{if(!e.isPrimary)return;this.pointer={x:e.clientX,y:e.clientY};if(this.running)this.stop("Baca otomatis dijeda untuk kendali manual.");});
  viewport.addEventListener("pointerup",e=>{if(!this.pointer)return;const dx=e.clientX-this.pointer.x,dy=e.clientY-this.pointer.y;this.pointer=null;if(this.mode==="book"&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)this.turn(dx<0?1:-1,true);});
  viewport.addEventListener("pointercancel",()=>{this.pointer=null;});
  global.addEventListener("keydown",e=>{
   if(!this.active||e.target.closest("input,select,textarea,[contenteditable=true]"))return;
   if(e.key==="Escape"){this.stop("Baca otomatis dijeda.");return;}
   if(this.mode==="book"&&["ArrowRight","ArrowLeft","PageDown","PageUp"].includes(e.key)){e.preventDefault();this.turn(["ArrowRight","PageDown"].includes(e.key)?1:-1,true);}
   else if(this.running&&[" ","ArrowDown","ArrowUp","PageDown","PageUp","Home","End"].includes(e.key))this.stop("Baca otomatis dijeda untuk kendali manual.");
  });
  global.addEventListener("wheel",()=>{if(this.running)this.stop("Baca otomatis dijeda untuk kendali manual.");},{passive:true});
  global.addEventListener("touchstart",e=>{if(this.running&&!e.target.closest("#auto-read,#read-speed"))this.stop("Baca otomatis dijeda untuk kendali manual.");},{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)this.stop("Baca otomatis dijeda saat tab ditinggalkan.");});
  global.addEventListener("pagehide",()=>this.stop());
  global.addEventListener("resize",()=>this.queueLayout());
  if("ResizeObserver" in global)new ResizeObserver(()=>{
   const width=Math.round(viewport.clientWidth);
   if(width&&width!==this.layoutWidth){this.layoutWidth=width;this.queueLayout();}
  }).observe(viewport);
  this.applyMode();this.controls();
 }
 setActive(value){
  this.active=value;
  if(!value){this.stop();clearTimeout(this.layoutTimer);return;}
  this.queueLayout();
 }
 setMode(mode){
  if(mode===this.mode)return;
  const anchor=this.sceneIndex();this.stop();this.mode=mode==="book"?"book":"scroll";this.state.set("readMode",this.mode);this.applyMode();
  requestAnimationFrame(()=>{if(this.mode==="book"){this.layout();this.goScene(anchor);}else{this.reader.style.transform="";this.scenes[anchor]?.scrollIntoView({block:"start",behavior:"instant"});}this.controls();this.onChange();});
  this.status(this.mode==="book"?"Geser kiri–kanan, gunakan panah, atau aktifkan halaman otomatis.":"Gulir sendiri atau tekan Mulai otomatis.");
 }
 applyMode(){
  this.shell.classList.toggle("book-mode",this.mode==="book");
  this.el("mode-scroll").setAttribute("aria-pressed",String(this.mode==="scroll"));
  this.el("mode-book").setAttribute("aria-pressed",String(this.mode==="book"));
  this.viewport.setAttribute("aria-label",this.mode==="book"?"Buku dongeng. Gunakan panah kiri dan kanan untuk berpindah halaman.":"Isi bacaan");
  if(this.mode==="scroll"){this.reader.style.transform="";this.shell.classList.remove("two-pages");}
 }
 controls(){
  const speed=this.state.data.readSpeed,labels=["Sangat pelan","Pelan","Normal","Cepat","Sangat cepat"];
  this.el("read-speed").value=speed;
  this.el("read-speed-label").textContent=this.mode==="book"?this.seconds()+" dtk / giliran":labels[speed-1];
  this.el("read-speed").setAttribute("aria-valuetext",this.mode==="book"?this.seconds()+" detik setiap pergantian halaman":labels[speed-1]);
  this.el("auto-read").textContent=this.running?"Jeda otomatis":"Mulai otomatis";
  this.el("auto-read").setAttribute("aria-pressed",String(this.running));
  this.el("auto-stop").hidden=!this.running;
 }
 seconds(){return[45,30,20,12,6][this.state.data.readSpeed-1];}
 pixelsPerSecond(){return[7,12,18,27,40][this.state.data.readSpeed-1];}
 status(message){if(message)this.el("reading-status").textContent=message;}
 queueLayout(){
  if(!this.active||this.mode!=="book")return;
  const anchor=this.sceneIndex(),front=this.page===0;
  clearTimeout(this.layoutTimer);
  this.layoutTimer=setTimeout(()=>{this.layout();if(!front)this.goScene(anchor);this.onChange();},90);
 }
 layout(){
  if(!this.active||this.mode!=="book"||!this.viewport.clientWidth)return;
  this.reader.classList.add("reflowing");
  const width=this.viewport.clientWidth,pad=parseFloat(getComputedStyle(this.viewport).paddingLeft)||32;
  this.visible=width>=780?2:1;
  // Column start distance = one paper leaf, including its two margins.
  this.step=width/this.visible;
  const column=this.step-pad*2;
  this.shell.style.setProperty("--column-width",column+"px");this.shell.style.setProperty("--visible-pages",String(this.visible));
  this.shell.classList.toggle("two-pages",this.visible===2);
  this.reader.style.transform="none";
  const gap=pad*2;
  this.total=Math.max(1,Math.round((this.reader.scrollWidth+gap)/(column+gap)));
  this.page=Math.min(Math.floor(this.page/this.visible)*this.visible,this.maxPage());
  this.paint();
  requestAnimationFrame(()=>this.reader.classList.remove("reflowing"));
 }
 maxPage(){return Math.floor((this.total-1)/this.visible)*this.visible;}
 paint(){
  if(this.mode!=="book")return;
  this.reader.style.transform="translateX("+(-this.page*this.step)+"px)";
  const end=Math.min(this.page+this.visible,this.total);
  this.el("page-label").textContent="Halaman "+(this.page+1)+(end>this.page+1?"–"+end:"")+" / "+this.total;
  this.el("page-prev").disabled=this.page===0;this.el("page-next").disabled=this.page>=this.maxPage();
  this.viewport.dataset.page=String(this.page+1);this.viewport.dataset.totalPages=String(this.total);
  this.onChange();
 }
 turn(direction,manual){
  if(this.mode!=="book"||!this.active)return;
  if(manual)this.stop("Halaman diganti secara manual.");
  const next=Math.max(0,Math.min(this.maxPage(),this.page+direction*this.visible));
  if(next===this.page){if(this.running)this.stop("Selesai. Akhir bacaan sudah tercapai.");return;}
  this.page=next;this.elapsed=0;this.paint();
 }
 sceneIndex(){
  if(!this.scenes.length)return 0;
  if(this.mode==="book"){
   const left=this.page*this.step;let index=0;
   const origin=this.reader.getBoundingClientRect().left;
   this.scenes.forEach((s,i)=>{const x=s.getBoundingClientRect().left-origin;if(x<=left+this.step*.55)index=i;});
   return index;
  }
  let best=0,dist=Infinity;const line=innerHeight*.42;
  this.scenes.forEach((s,i)=>{const r=s.getBoundingClientRect(),d=r.top<=line&&r.bottom>=line?0:Math.min(Math.abs(r.top-line),Math.abs(r.bottom-line));if(d<dist){dist=d;best=i;}});
  return best;
 }
 goScene(index){
  if(this.mode!=="book")return;
  const scene=this.scenes[index];if(!scene)return;
  const x=scene.getBoundingClientRect().left-this.reader.getBoundingClientRect().left;
  this.page=Math.max(0,Math.min(this.maxPage(),Math.floor((x+1)/this.step/this.visible)*this.visible));this.paint();
 }
 resume(mark){
  if(!mark)return;
  clearTimeout(this.layoutTimer);
  if(this.mode==="book"){this.layout();if(Number.isInteger(mark.bookPage)){this.page=Math.min(this.maxPage(),Math.floor(mark.bookPage/this.visible)*this.visible);this.paint();}else this.goScene(mark.scene);}
  else this.scenes[mark.scene]?.scrollIntoView({block:"start",behavior:"instant"});
 }
 start(){
  if(!this.active||this.running)return;
  if(this.mode==="book")this.layout();
  this.running=true;this.elapsed=0;this.lastTime=0;this.scrollPosition=scrollY;
  if(this.mode==="scroll"){
   const top=this.reader.getBoundingClientRect().top+scrollY-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--toolbar-height"))||70)-14;
   if(scrollY<top){scrollTo({top,behavior:"instant"});this.scrollPosition=scrollY;}
  }
  if(this.mode==="book"){const top=this.shell.getBoundingClientRect().top+scrollY-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--toolbar-height"))||70)-12;scrollTo({top:Math.max(0,top),behavior:"instant"});}
  this.controls();this.status(this.mode==="book"?"Halaman berganti otomatis. Tekan Jeda otomatis kapan saja.":"Bacaan bergulir otomatis. Gulir manual atau tekan Jeda otomatis untuk berhenti.");
  this.frame=requestAnimationFrame(this.tick);
 }
 stop(message){
  this.running=false;cancelAnimationFrame(this.frame);this.frame=0;this.lastTime=0;this.elapsed=0;
  this.el("auto-page-progress").style.width="0%";this.controls();this.status(message);
 }
 tick(time){
  if(!this.running||!this.active||document.hidden){this.stop();return;}
  const dt=this.lastTime?Math.min(time-this.lastTime,100):0;this.lastTime=time;
  if(this.mode==="book"){
   this.elapsed+=dt;this.el("auto-page-progress").style.width=Math.min(100,this.elapsed/(this.seconds()*10))+"%";
   if(this.elapsed>=this.seconds()*1000)this.turn(1,false);
  }else{
   const player=document.querySelector(".player").getBoundingClientRect().height;
   const end=Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+this.reader.getBoundingClientRect().bottom-innerHeight+player+22);
   this.scrollPosition=Math.min(end,this.scrollPosition+this.pixelsPerSecond()*dt/1000);
   scrollTo({top:this.scrollPosition,behavior:"instant"});
   if(scrollY>=end-1)this.stop("Selesai. Akhir bacaan sudah tercapai.");
   this.onChange();
  }
  if(this.running)this.frame=requestAnimationFrame(this.tick);
 }
}
global.VaeloriaReadingModes=VaeloriaReadingModes;
})(typeof window!=="undefined"?window:globalThis);
