/** Retry only policy-blocked playback, in the synchronous user-gesture handler. */
export function startMusicAutoplay(audio:HTMLAudioElement,doc:Document,notify:(state:'waiting'|'playing'|'failed')=>void){
 let active=true,pending=false,waiting=false;
 const events=['click','touchend','keydown'] as const;
 function detach(){for(const event of events)doc.removeEventListener(event,interact,true);}
 function interact(event:Event){
  if(!event.isTrusted||!waiting||pending)return;
  // Let the music button handle its own gesture; do not play then immediately toggle off.
  if((event.target as Element|null)?.closest?.('.invitation-music'))return;
  if(event.type==='keydown'){
   const key=event as KeyboardEvent;
   if(key.repeat||key.ctrlKey||key.altKey||key.metaKey||!['Enter',' '].includes(key.key))return;
  }
  attempt();
 }
 function attempt(){
  if(!active||pending)return;
  pending=true;
  // No await/timer before play(): Safari requires the call inside the gesture itself.
  void audio.play().then(()=>{
   if(!active)return;
   pending=false;waiting=false;detach();notify('playing');
  }).catch((error:unknown)=>{
   if(!active)return;
   pending=false;
   if((error as {name?:string}|null)?.name==='NotAllowedError'){
    waiting=true;notify('waiting');
    for(const event of events)doc.addEventListener(event,interact,true);
   }else{waiting=false;detach();notify('failed');}
  });
 }
 attempt();
 return ()=>{active=false;waiting=false;detach();};
}