'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {CSSProperties} from 'react';
import {startMusicAutoplay} from './music-autoplay';
import {FALLBACK_AUDIO_URL} from './media-fallback';

/** Mounted only after the invitation is open and music is enabled in its layout. */
export function MusicControl({src,autoplay=false,preview=false,color}:{src:string;autoplay?:boolean;preview?:boolean;color:string}){
 const player=useRef<HTMLAudioElement>(null);
 const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),[host,setHost]=useState<HTMLElement|null>(null);
 const [usingFallback,setUsingFallback]=useState(false);
 const anchor=useRef<HTMLSpanElement>(null);
 const cancelAutoplay=useRef<(()=>void)|null>(null);
 const [waiting,setWaiting]=useState(false);
 useEffect(()=>{setHost(anchor.current?.ownerDocument.body??null);},[]);
 useEffect(()=>{
  const audio=player.current;if(!audio)return;
  setPlaying(false);setFailed(false);setWaiting(false);setUsingFallback(false);
  // Previews stay silent until explicitly played, including the separate preview window.
  if(autoplay&&!preview)cancelAutoplay.current=startMusicAutoplay(audio,audio.ownerDocument,state=>{
   setWaiting(state==='waiting');setFailed(state==='failed');
  });
  return()=>{cancelAutoplay.current?.();cancelAutoplay.current=null;audio.pause();};
 },[src,autoplay,preview,host]);
 function toggleMusic(){
  const audio=player.current;if(!audio)return;
  cancelAutoplay.current?.();cancelAutoplay.current=null;
  setFailed(false);setWaiting(false);
  if(audio.paused){
   audio.volume=0.82;
   void audio.play().catch(()=>{
    if(!usingFallback&&audio.src&&!audio.src.endsWith(FALLBACK_AUDIO_URL)){
     setUsingFallback(true);
     audio.src=FALLBACK_AUDIO_URL;
     void audio.play().catch(()=>{setPlaying(false);setFailed(true);});
    }else{
     setPlaying(false);setFailed(true);
    }
   });
  }else audio.pause();
 }
 const label=playing?'Tắt nhạc nền':'Bật nhạc nền';
 const activeSrc=usingFallback?FALLBACK_AUDIO_URL:src;
 const control=<div className={`invitation-music ${preview?'is-preview':''}${playing?' is-playing':''}`} style={{'--wedding-accent':color} as CSSProperties}>
  {waiting&&<button type="button" className="invitation-music-prompt" onClick={toggleMusic}>Chạm để nghe nhạc<span>Trình duyệt cần bạn cho phép phát âm thanh</span></button>}
  <button type="button" className="invitation-music-button" aria-label={label} title={label} aria-pressed={playing} onClick={toggleMusic}>
   {playing
    ?<span className="music-soundwave" aria-hidden="true"><i/><i/><i/><i/></span>
    :<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/><path d="M3 3l18 18"/></svg>}
  </button>
  <span className="sr-only" role="status">{failed?'Không phát được nhạc. Hãy thử bấm lại.':waiting?'Trình duyệt đang chặn tự phát. Chạm vào thiệp hoặc bấm nút nhạc để nghe.':playing?'Đang phát nhạc nền':'Nhạc nền đang tắt'}</span>
  <audio ref={player} src={activeSrc} loop preload="none" onPlay={()=>{setPlaying(true);setWaiting(false);setFailed(false);}} onPause={()=>setPlaying(false)} onError={()=>{
   if(!usingFallback&&src!==FALLBACK_AUDIO_URL){
    setUsingFallback(true);
    setFailed(false);
    return;
   }
   cancelAutoplay.current?.();setWaiting(false);setPlaying(false);setFailed(true);
  }}/>
 </div>;
 return <><span ref={anchor}/>{preview?control:host&&createPortal(control,host)}</>;
}
