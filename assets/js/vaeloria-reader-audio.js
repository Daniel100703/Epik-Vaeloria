/* Follow the scene intersecting the reader's eye line; debounce small scrolls. */
(function(global){
"use strict";
class VaeloriaReaderMusic{
 constructor(engine,root=document){
  this.engine=engine;this.enabled=false;this.frame=0;this.pending=null;this.candidate=null;
  this.scenes=[...root.querySelectorAll("[data-mood]")];this.onScene=()=>{};
  this.measure=this.measure.bind(this);this.queue=this.queue.bind(this);
 }
 start(){if(this.enabled)return;this.enabled=true;global.addEventListener("scroll",this.queue,{passive:true});global.addEventListener("resize",this.queue);this.queue();}
 stop(){this.enabled=false;global.removeEventListener("scroll",this.queue);global.removeEventListener("resize",this.queue);cancelAnimationFrame(this.frame);clearTimeout(this.pending);this.frame=0;this.candidate=null;}
 queue(){if(this.enabled&&!this.frame)this.frame=requestAnimationFrame(this.measure);}
 measure(){
  this.frame=0;if(!this.enabled)return;const line=global.innerHeight*.42;let best=null,distance=Infinity;
  for(const scene of this.scenes){const r=scene.getBoundingClientRect();if(!r.height||r.bottom<=0||r.top>=global.innerHeight)continue;const d=r.top<=line&&r.bottom>=line?0:Math.min(Math.abs(r.top-line),Math.abs(r.bottom-line));if(d<distance){distance=d;best=scene;}}
  if(!best)return;const key=best.dataset.motif||best.dataset.mood;
  if(key===this.candidate)return;this.candidate=key;clearTimeout(this.pending);
  this.pending=setTimeout(()=>{if(this.enabled&&this.candidate===key){try{this.engine.choose(key);this.onScene(key,best);}catch(_){}}},350);
 }
}
global.VaeloriaReaderMusic=VaeloriaReaderMusic;
})(typeof window!=="undefined"?window:globalThis);
