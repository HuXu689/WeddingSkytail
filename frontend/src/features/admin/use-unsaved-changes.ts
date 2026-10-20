'use client';
import {useEffect} from 'react';

interface TraversalEvent extends Event {navigationType:string;destination:{url:string}}
/** Do not rewrite Next's history entries or push sentinel URLs. Unsupported browsers
 * retain the native beforeunload warning for document navigation and the link guard. */
export function useUnsavedChanges(dirty:boolean,message:string){
 useEffect(()=>{
  if(!dirty)return;
  const confirm=()=>window.confirm(message);
  const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  const click=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
   if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target.toLowerCase()!=='_self')||anchor.href===location.href)return;
   const destination=new URL(anchor.href,location.href);
   if(!['http:','https:'].includes(destination.protocol))return;
   if(destination.origin===location.origin&&destination.pathname===location.pathname&&destination.search===location.search)return;
   if(!confirm()){event.preventDefault();event.stopPropagation();}
  };
  const navigation=(window as Window&{navigation?:EventTarget}).navigation;
  const traverse=(event:Event)=>{
   const change=event as TraversalEvent;
   if(change.navigationType!=='traverse'||!event.cancelable)return;
   const target=new URL(change.destination.url,location.href);
   if(target.origin===location.origin&&target.pathname===location.pathname&&target.search===location.search)return;
   if(!confirm())event.preventDefault();
  };
  window.addEventListener('beforeunload',unload);
  document.addEventListener('click',click,true);
  navigation?.addEventListener('navigate',traverse);
  return()=>{
   window.removeEventListener('beforeunload',unload);
   document.removeEventListener('click',click,true);
   navigation?.removeEventListener('navigate',traverse);
  };
 },[dirty,message]);
}