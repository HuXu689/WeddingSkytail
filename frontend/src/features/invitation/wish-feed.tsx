'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
import {approvedWishPath,type ApprovedWishItem,type ApprovedWishPage,type WishFeedScope} from '@/shared/invitation-features';

/** A keyed scope prevents a late response from displaying another invitation's feed. */
export function WishFeed({scope}:{scope:WishFeedScope}){
 const path=approvedWishPath(scope);
 return <ScopedWishFeed key={path} path={path}/>;
}
function ScopedWishFeed({path}:{path:string}){
 const [items,setItems]=useState<ApprovedWishItem[]>([]),[cursor,setCursor]=useState<string|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef(false),loading=useRef(false),sequence=useRef(0),retryCursor=useRef<string|null>(null);
 async function load(after:string|null){
  if(loading.current)return;
  loading.current=true;retryCursor.current=after;const request=++sequence.current;setBusy(true);setError('');
  try{
   const page=await api<ApprovedWishPage>(after===null?path:`${path}?cursor=${encodeURIComponent(after)}`);
   if(!active.current||request!==sequence.current)return;
   setItems(previous=>Array.from(new Map((after===null?page.items:[...previous,...page.items]).map(item=>[item.id,item])).values()));
   setCursor(page.nextCursor);setLoaded(true);
  }catch{if(active.current&&request===sequence.current)setError('Không tải được lời chúc. Vui lòng thử lại.');}
  finally{if(active.current&&request===sequence.current){loading.current=false;setBusy(false);}}
 }
 useEffect(()=>{
  active.current=true;void load(null);
  return()=>{active.current=false;sequence.current++;loading.current=false;};
 // The parent remounts this component whenever the scope path changes.
 },[path]);
 return <div className="wish-feed" aria-busy={busy}>
  <div className="wish-list">{items.map(wish=><blockquote className="wish-item" key={wish.id}><p>{text(wish.message)}</p><cite>{oneLine(wish.display_name)}</cite></blockquote>)}</div>
  {busy&&<p role="status" className="field-hint">Đang tải lời chúc…</p>}
  {loaded&&!busy&&items.length===0&&<p className="field-hint">Chưa có lời chúc nào được duyệt.</p>}
  {error&&<p role="alert" className="error">{error}</p>}
  <div className="row">{error?<button type="button" className="secondary" disabled={busy} onClick={()=>void load(retryCursor.current)}>Thử tải lại lời chúc</button>:cursor&&<button type="button" className="secondary" disabled={busy} onClick={()=>void load(cursor)}>Xem thêm lời chúc</button>}
  {loaded&&<button type="button" className="secondary" disabled={busy} onClick={()=>void load(null)}>Làm mới lời chúc</button>}</div>
 </div>;
}