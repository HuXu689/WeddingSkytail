/** Native details must open before focusing a descendant; no animation or unmount delay. */
export function openResponse(id:string){
 const disclosure=document.getElementById(`response-${id}`);
 if(!(disclosure instanceof HTMLDetailsElement))return;
 disclosure.open=true;
 const target=disclosure.querySelector<HTMLElement>('select:not(:disabled),input:not(:disabled),textarea:not(:disabled)')??disclosure.querySelector<HTMLElement>('summary');
 target?.focus({preventScroll:true});
 disclosure.scrollIntoView({block:'start',behavior:'instant'});
}