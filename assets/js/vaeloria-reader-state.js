/* Reader preferences. Only local reading preferences are stored. */
(function(global){
"use strict";
class VaeloriaReaderState{
 constructor(storage){this.storage=storage;this.persisted=true;this.key="vaeloria-reader-v1";this.data=this.defaults();this.load();}
 defaults(){return{theme:"dark",font:20,motion:true,volume:.3,follow:true,bookmark:null};}
 load(){
  try{
   const raw=JSON.parse(this.storage.getItem(this.key)||"null");
   if(!raw||typeof raw!=="object")return;
   if(raw.theme==="sepia"||raw.theme==="dark")this.data.theme=raw.theme;
   if(Number.isFinite(raw.font))this.data.font=Math.max(16,Math.min(26,Math.round(raw.font)));
   if(Number.isFinite(raw.volume))this.data.volume=Math.max(0,Math.min(.65,raw.volume));
   if(typeof raw.motion==="boolean")this.data.motion=raw.motion;
   if(typeof raw.follow==="boolean")this.data.follow=raw.follow;
   if(raw.bookmark&&Number.isInteger(raw.bookmark.scene)&&raw.bookmark.scene>=0&&raw.bookmark.scene<8)this.data.bookmark={scene:raw.bookmark.scene};
  }catch(_){this.persisted=false;}
 }
 save(){try{this.storage.setItem(this.key,JSON.stringify(this.data));this.persisted=true;return true;}catch(_){this.persisted=false;return false;}}
 set(name,value){
  if(name==="font")this.data.font=Math.max(16,Math.min(26,Math.round(Number(value)||20)));
  else if(name==="volume")this.data.volume=Math.max(0,Math.min(.65,Number(value)||0));
  else if(name==="theme")this.data.theme=value==="sepia"?"sepia":"dark";
  else if(name==="motion"||name==="follow")this.data[name]=!!value;
  else return false;
  return this.save();
 }
 mark(scene){if(!Number.isInteger(scene)||scene<0||scene>7)return false;this.data.bookmark={scene};return this.save();}
 clearBookmark(){this.data.bookmark=null;return this.save();}
}
global.VaeloriaReaderState=VaeloriaReaderState;
})(typeof window!=="undefined"?window:globalThis);
