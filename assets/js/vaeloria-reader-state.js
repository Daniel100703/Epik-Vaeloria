/* Reader preferences. Only local reading preferences are stored. */
(function(global){
"use strict";
class VaeloriaReaderState{
 constructor(storage){this.storage=storage;this.persisted=true;this.key="vaeloria-reader-v1";this.data=this.defaults();this.load();}
 defaults(){return{readMode:"scroll",readSpeed:3,appearance:2,theme:"dusk",font:20,motion:true,volume:.3,follow:true,bookmark:null};}
 load(){
  try{
   const raw=JSON.parse(this.storage.getItem(this.key)||"null");
   if(!raw||typeof raw!=="object")return;
   if(["dusk","dark","sepia"].includes(raw.theme))this.data.theme=raw.theme==="dark"&&raw.appearance!==2?"dusk":raw.theme;
   if(raw.readMode==="book"||raw.readMode==="scroll")this.data.readMode=raw.readMode;
   if(Number.isFinite(raw.readSpeed))this.data.readSpeed=Math.max(1,Math.min(5,Math.round(raw.readSpeed)));
   if(Number.isFinite(raw.font))this.data.font=Math.max(16,Math.min(26,Math.round(raw.font)));
   if(Number.isFinite(raw.volume))this.data.volume=Math.max(0,Math.min(.65,raw.volume));
   if(typeof raw.motion==="boolean")this.data.motion=raw.motion;
   if(typeof raw.follow==="boolean")this.data.follow=raw.follow;
   if(raw.bookmark&&Number.isInteger(raw.bookmark.scene)&&raw.bookmark.scene>=0&&raw.bookmark.scene<8)this.data.bookmark={scene:raw.bookmark.scene,...(Number.isInteger(raw.bookmark.bookPage)&&raw.bookmark.bookPage>=0?{bookPage:raw.bookmark.bookPage}:{})};
  }catch(_){this.persisted=false;}
 }
 save(){try{this.storage.setItem(this.key,JSON.stringify(this.data));this.persisted=true;return true;}catch(_){this.persisted=false;return false;}}
 set(name,value){
  if(name==="readMode")this.data.readMode=value==="book"?"book":"scroll";
  else if(name==="readSpeed")this.data.readSpeed=Math.max(1,Math.min(5,Math.round(Number(value)||3)));
  else if(name==="font")this.data.font=Math.max(16,Math.min(26,Math.round(Number(value)||20)));
  else if(name==="volume")this.data.volume=Math.max(0,Math.min(.65,Number(value)||0));
  else if(name==="theme")this.data.theme=["dusk","dark","sepia"].includes(value)?value:"dusk";
  else if(name==="motion"||name==="follow")this.data[name]=!!value;
  else return false;
  return this.save();
 }
 mark(scene,bookPage){if(!Number.isInteger(scene)||scene<0||scene>7)return false;this.data.bookmark={scene,...(Number.isInteger(bookPage)&&bookPage>=0?{bookPage}:{})};return this.save();}
 clearBookmark(){this.data.bookmark=null;return this.save();}
}
global.VaeloriaReaderState=VaeloriaReaderState;
})(typeof window!=="undefined"?window:globalThis);
