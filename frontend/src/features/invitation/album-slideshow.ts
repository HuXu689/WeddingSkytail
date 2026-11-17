'use client';
import {useEffect,useRef} from 'react';

/**
 * Bộ nhịp trình chiếu ảnh kỷ niệm:
 * - Chỉ chạy khi khách chủ động bấm "Trình chiếu kỷ niệm".
 * - Tự tạm dừng khi tab trình duyệt ẩn hoặc người dùng bật prefers-reduced-motion.
 */
export function useAlbumSlideshow(running:boolean,intervalMs:number,onAdvance:()=>void):void{
  const stepRef=useRef(onAdvance);
  stepRef.current=onAdvance;

  useEffect(()=>{
    if(!running||typeof window==='undefined')return;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if(reduced?.matches)return;

    const timer=window.setInterval(()=>{
      if(!document.hidden){
        stepRef.current();
      }
    },intervalMs);

    return()=>window.clearInterval(timer);
  },[running,intervalMs]);
}
