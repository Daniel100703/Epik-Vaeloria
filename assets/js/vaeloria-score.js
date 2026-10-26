/* Epik Vaeloria. Original procedural score; no external samples. */
(function(global){
"use strict";
const frequency=n=>440*Math.pow(2,(n-69)/12);
class VaeloriaScore{
 constructor(catalog,onState=()=>{}){
  this.catalog=catalog;this.onState=onState;this.ctx=null;this.bus=null;this.retired=[];
  this.key="keluarga";this.volume=.30;this.muted=false;this.playing=false;
  this.step=0;this.next=0;this.timer=null;this.request=0;this.pending=null;this.closed=false;
 }
 score(key){
  if(this.catalog.moods[key])return this.catalog.moods[key];
  const m=this.catalog.motifs[key];if(!m)throw Error("Motif tidak dikenal.");
  return Object.assign({},this.catalog.moods[m.mood],m);
 }
 async init(){
  if(this.closed)throw Error("Pemutar telah ditutup.");
  if(!this.ctx){
   const AC=global.AudioContext||global.webkitAudioContext;
   if(!AC)throw Error("Peramban ini belum mendukung audio interaktif.");
   this.ctx=new AC();const c=this.ctx.createDynamicsCompressor();
   c.threshold.value=-18;c.knee.value=18;c.ratio.value=4;c.attack.value=.01;c.release.value=.3;
   this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:this.volume;
   this.master.connect(c);c.connect(this.ctx.destination);
   this.impulse=this.ctx.createBuffer(2,Math.ceil(this.ctx.sampleRate*2.8),this.ctx.sampleRate);
   let seed=1977;
   for(let ch=0;ch<2;ch++){
    const d=this.impulse.getChannelData(ch);
    for(let i=0;i<d.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d[i]=(seed/2147483648-1)*Math.pow(1-i/d.length,3.2)*.38;}
   }
  }
  if(this.ctx.state!=="running")await this.ctx.resume();
  if(this.ctx.state!=="running")throw Error("Klik Putar musik untuk mengizinkan audio.");
 }
 newBus(){
  const t=this.ctx.currentTime,input=this.ctx.createGain(),out=this.ctx.createGain();
  const reverb=this.ctx.createConvolver(),wet=this.ctx.createGain();reverb.buffer=this.impulse;wet.gain.value=.23;
  input.connect(out);input.connect(reverb);reverb.connect(wet);wet.connect(out);out.connect(this.master);
  out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(.82,t+1.8);
  return{input,out,nodes:[input,out,reverb,wet],voices:new Set(),cleanup:null};
 }
 dispose(bus){
  if(!bus)return;clearTimeout(bus.cleanup);
  for(const s of [...bus.voices]){try{s.stop();}catch(_){}}
  bus.voices.clear();for(const n of bus.nodes){try{n.disconnect();}catch(_){}}
  this.retired=this.retired.filter(b=>b!==bus);
 }
 retire(bus){
  if(!bus)return;const t=this.ctx.currentTime,p=bus.out.gain;
  if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);
  else{const value=p.value;p.cancelScheduledValues(t);p.setValueAtTime(value,t);}
  p.linearRampToValueAtTime(0,t+1.8);this.retired.push(bus);
  bus.cleanup=setTimeout(()=>this.dispose(bus),2100);
  while(this.retired.length>2)this.dispose(this.retired[0]);
 }
 async play(){
  if(this.playing)return;if(this.pending)return this.pending;
  const token=++this.request;
  const job=(async()=>{
   await this.init();if(token!==this.request||this.closed)return;
   this.playing=true;this.bus=this.newBus();this.step=0;this.next=this.ctx.currentTime+.06;
   this.timer=setInterval(()=>this.tick(),35);this.tick();this.onState(this);
  })();
  this.pending=job;
  try{await job;}finally{if(this.pending===job)this.pending=null;}
 }
 pause(){
  this.request++;this.playing=false;clearInterval(this.timer);this.timer=null;
  this.retire(this.bus);this.bus=null;this.onState(this);
 }
 choose(key){
  this.score(key);if(key===this.key)return;
  this.key=key;
  if(this.playing){this.retire(this.bus);this.bus=this.newBus();this.step=0;this.next=this.ctx.currentTime+.06;this.tick();}
  this.onState(this);
 }
 setVolume(v){this.volume=Math.max(0,Math.min(.65,Number(v)||0));this.updateVolume();}
 setMuted(v){this.muted=!!v;this.updateVolume();this.onState(this);}
 updateVolume(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.ctx.currentTime,.07);}
 tone(note,start,duration,amp,kind,bus){
  if(amp<=0)return;const ctx=this.ctx,g=ctx.createGain(),f=ctx.createBiquadFilter();
  f.type="lowpass";f.frequency.value=kind==="pad"?950:kind==="horn"?1250:kind==="wood"?1700:2800;
  f.Q.value=.5;g.connect(f);f.connect(bus.input);
  const attack=kind==="pad"?.65:kind==="horn"?.12:.015;
  const release=kind==="pad"?1.4:kind==="bell"?1.2:.35,end=start+duration+release;
  g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(amp,start+Math.min(attack,duration*.3));
  if(["pluck","bell","wood"].includes(kind))g.gain.exponentialRampToValueAtTime(.0001,end);
  else{g.gain.setValueAtTime(amp*.75,start+duration);g.gain.linearRampToValueAtTime(0,end);}
  const voices=kind==="pad"?3:kind==="bell"?2:1;let remaining=voices;
  for(let i=0;i<voices;i++){
   const o=ctx.createOscillator(),level=ctx.createGain();
   o.type=kind==="pad"||kind==="horn"?"sawtooth":kind==="pluck"?"triangle":"sine";
   o.frequency.value=frequency(note)*(kind==="bell"&&i===1?2.003:1);o.detune.value=kind==="pad"?(i-1)*6:0;
   level.gain.value=kind==="pad"?1/3:kind==="bell"&&i===1?.18:1;o.connect(level);level.connect(g);bus.voices.add(o);
   o.onended=()=>{bus.voices.delete(o);o.disconnect();level.disconnect();if(--remaining===0){g.disconnect();f.disconnect();}};
   o.start(start);o.stop(end+.02);
  }
 }
 drum(start,amp,soft,bus){
  const ctx=this.ctx,o=ctx.createOscillator(),g=ctx.createGain();
  o.type="sine";o.frequency.setValueAtTime(soft?105:90,start);o.frequency.exponentialRampToValueAtTime(40,start+.22);
  g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(amp,start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+.45);
  o.connect(g);g.connect(bus.input);bus.voices.add(o);
  o.onended=()=>{bus.voices.delete(o);o.disconnect();g.disconnect();};o.start(start);o.stop(start+.5);
 }
 tick(){
  if(!this.playing||!this.bus||this.ctx.state!=="running")return;
  const score=this.score(this.key),half=30/score.tempo;
  if(this.next<this.ctx.currentTime-.2)this.next=this.ctx.currentTime+.04;
  while(this.next<this.ctx.currentTime+.18){
   const s=this.step,bar=Math.floor(s/8),pos=s%8,t=this.next,b=this.bus,chord=score.chords[bar%score.chords.length],section=Math.floor(bar/4)%4;
   if(pos===0){for(const n of chord)this.tone(score.root+n,t,half*7.4,score.pad/3,"pad",b);this.tone(score.root+chord[0]-12,t,half*6,score.bass,"bass",b);}
   // Leave room for reading: each fourth phrase rests earlier.
   const degree=score.melody[(s+(section===2?4:0))%score.melody.length];
   if(degree!==null&&!(section===3&&pos>4)){
    const n=score.root+12+score.scale[degree%score.scale.length]+12*Math.floor(degree/score.scale.length);
    this.tone(n,t,half*(pos%2===0?1.5:.8),score.lead*(section===1?.78:1),score.instrument,b);
   }
   if(score.drum>0&&(pos===0||pos===4||(this.key==="perang"&&pos===6)))this.drum(t,score.drum,this.key!=="perang",b);
   this.step++;this.next+=half;
  }
 }
 async suspendHidden(){if(this.ctx&&this.ctx.state==="running")await this.ctx.suspend();}
 async resumeVisible(){if(this.playing&&this.ctx&&this.ctx.state==="suspended"){await this.ctx.resume();this.next=this.ctx.currentTime+.06;this.tick();}}
 async destroy(){this.closed=true;this.request++;clearInterval(this.timer);this.playing=false;this.dispose(this.bus);this.bus=null;for(const b of [...this.retired])this.dispose(b);if(this.ctx&&this.ctx.state!=="closed")await this.ctx.close();}
}
global.VaeloriaScore=VaeloriaScore;
})(typeof window!=="undefined"?window:globalThis);
