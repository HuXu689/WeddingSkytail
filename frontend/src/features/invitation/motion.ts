/** Content is visible by default; observation only adds an optional, one-shot flourish. */
export function observeInvitation(root:HTMLElement,environment:Window=root.ownerDocument.defaultView??window):()=>void {
 if(typeof environment.matchMedia!=='function')return()=>{};
 const preference=environment.matchMedia('(prefers-reduced-motion: reduce)');
 let observer:IntersectionObserver|null=null;
 const stop=()=>{observer?.disconnect();observer=null;};
 const start=()=>{
  stop();
  if(preference.matches)return;
  const items=Array.from(root.querySelectorAll<HTMLElement>('.reveal')).filter(item=>
   !item.classList.contains('is-visible')&&!item.matches('form')&&!item.closest('form')&&!item.querySelector('form'));
  try{
   if(!('IntersectionObserver' in environment))return;
   const Observer=(environment as Window & {IntersectionObserver:typeof IntersectionObserver}).IntersectionObserver;
   observer=new Observer(entries=>{
    entries.forEach(entry=>{
     if(!entry.isIntersecting)return;
     const item=entry.target as HTMLElement;
     // Never move a region while the guest is interacting with it.
     if(!item.contains(root.ownerDocument.activeElement))item.classList.add('is-visible');
     observer?.unobserve(item);
    });
   },{threshold:.12});
   items.forEach(item=>observer?.observe(item));
  }catch{stop();}
 };
 start();preference.addEventListener?.('change',start);
 return()=>{stop();preference.removeEventListener?.('change',start);};
}