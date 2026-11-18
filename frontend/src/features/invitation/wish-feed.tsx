'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Heart,RefreshCw,RotateCcw} from 'lucide-react';
import {api} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
import {approvedWishPath,wishHeartPath,type ApprovedWishItem,type ApprovedWishPage,type WishFeedScope} from '@/shared/invitation-features';

const LIKED_WISHES_STORAGE_KEY='wedding-wish-hearted-ids';

/** dd/mm/yyyy ngắn cho caption lời chúc; trả chuỗi rỗng khi thiếu/không hợp lệ để không hiện ngày rỗng. */
function wishStamp(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}

/** A keyed scope prevents a late response from displaying another invitation's feed. */
export function WishFeed({scope}:{scope:WishFeedScope}){
 const path=approvedWishPath(scope);
 return <ScopedWishFeed key={path} path={path} scope={scope}/>;
}

function ScopedWishFeed({path,scope}:{path:string;scope:WishFeedScope}){
 const [items,setItems]=useState<ApprovedWishItem[]>([]),[cursor,setCursor]=useState<string|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[pinnedOnly,setPinnedOnly]=useState(false),[liveNotice,setLiveNotice]=useState('');
 const [likedIds,setLikedIds]=useState<Record<string,boolean>>({});
 const active=useRef(false),loading=useRef(false),sequence=useRef(0),retryCursor=useRef<string|null>(null);

 useEffect(()=>{
  if(typeof window==='undefined')return;
  try{
   const raw=window.localStorage.getItem(LIKED_WISHES_STORAGE_KEY);
   if(raw){
    const parsed=JSON.parse(raw) as unknown;
    if(Array.isArray(parsed)){
     const map:Record<string,boolean>={};
     for(const id of parsed){if(typeof id==='string')map[id]=true;}
     setLikedIds(map);
    }
   }
  }catch{}
 },[]);

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

 // Đồng bộ thời gian thực nhẹ nhàng (Visibility-aware Live Polling + BroadcastChannel giữa các tab).
 useEffect(()=>{
  if(!loaded||typeof window==='undefined')return;
  let noticeTimer=0;
  async function silentPoll(){
   if(!active.current||loading.current||document.hidden||error)return;
   try{
    const fresh=await api<ApprovedWishPage>(path);
    if(!active.current||loading.current)return;
    setItems(previous=>{
     const prevIds=new Set(previous.map(x=>x.id));
     const added=fresh.items.filter(x=>!prevIds.has(x.id));
     if(added.length>0){
      setLiveNotice(`✦ Vừa có ${added.length} lời chúc mới được duyệt`);
      window.clearTimeout(noticeTimer);
      noticeTimer=window.setTimeout(()=>setLiveNotice(''),4200);
     }
     if(added.length===0&&fresh.items.length===previous.length){
      const changed=fresh.items.some((item,idx)=>previous[idx]?.id!==item.id||previous[idx]?.pinned!==item.pinned||previous[idx]?.message!==item.message||Number(previous[idx]?.heart_count??0)!==Number(item.heart_count??0));
      if(!changed)return previous;
     }
     return Array.from(new Map([...previous,...fresh.items].map(item=>[item.id,item])).values()).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||Date.parse(b.created_at)-Date.parse(a.created_at));
    });
   }catch{}
  }
  const interval=window.setInterval(()=>{void silentPoll();},25000);
  let channel:BroadcastChannel|null=null;
  try{
   if(typeof BroadcastChannel!=='undefined'){
    channel=new BroadcastChannel('wedding-wishes-live');
    channel.onmessage=()=>{void silentPoll();};
   }
  }catch{}
  return()=>{
   window.clearInterval(interval);
   window.clearTimeout(noticeTimer);
   channel?.close();
  };
 },[loaded,path,error]);

 const hasPinned=useMemo(()=>items.some(w=>w.pinned),[items]);
 const visibleItems=useMemo(()=>{
  const kw=query.trim().toLowerCase();
  return items.filter(w=>{
   if(pinnedOnly&&!w.pinned)return false;
   if(kw&&!w.display_name.toLowerCase().includes(kw)&&!w.message.toLowerCase().includes(kw))return false;
   return true;
  });
 },[items,query,pinnedOnly]);

 async function sendHeart(wishId:string){
  setLikedIds(prev=>{
   const next={...prev,[wishId]:true};
   try{window.localStorage.setItem(LIKED_WISHES_STORAGE_KEY,JSON.stringify(Object.keys(next).slice(-300)));}catch{}
   return next;
  });
  setItems(prev=>prev.map(item=>item.id===wishId?{...item,heart_count:Number(item.heart_count??0)+1}:item));
  if(typeof window!=='undefined'){
   window.dispatchEvent(new CustomEvent('wedding:hearts'));
  }
  try{
   const res=await api<{id:string;heart_count:number}>(wishHeartPath(scope,wishId),'POST',{count:1});
   if(active.current&&typeof res.heart_count==='number'){
    setItems(prev=>prev.map(item=>item.id===wishId?{...item,heart_count:Math.max(Number(item.heart_count??0),Number(res.heart_count))}:item));
   }
   try{
    if(typeof BroadcastChannel!=='undefined'){
     const ch=new BroadcastChannel('wedding-wishes-live');
     ch.postMessage('heart');
     ch.close();
    }
   }catch{}
  }catch{
   if(active.current){
    setItems(prev=>prev.map(item=>item.id===wishId?{...item,heart_count:Math.max(0,Number(item.heart_count??1)-1)}:item));
   }
  }
 }

 return <div className="wish-feed" aria-busy={busy}>
  {liveNotice&&<p className="wish-live-pill" role="status">{liveNotice}</p>}
  {items.length>=3&&<div className="wish-feed-toolbar">
   <div className="wish-filter-pills" role="group" aria-label="Lọc sổ lời chúc">
    <button type="button" className={`secondary wish-filter-pill${!pinnedOnly?' is-active':''}`} aria-pressed={!pinnedOnly} onClick={()=>setPinnedOnly(false)}>Tất cả ({items.length})</button>
    {hasPinned&&<button type="button" className={`secondary wish-filter-pill${pinnedOnly?' is-active':''}`} aria-pressed={pinnedOnly} onClick={()=>setPinnedOnly(true)}>Được ghim ({items.filter(w=>w.pinned).length})</button>}
   </div>
   <input className="wish-search-input" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo tên hoặc lời chúc…" aria-label="Tìm lời chúc"/>
  </div>}
  <div className="wish-list">{visibleItems.map(wish=>{
   const hearts=Number(wish.heart_count??0);
   const isLiked=Boolean(likedIds[wish.id])||hearts>0;
   return <blockquote className="wish-item motion-fade" key={wish.id}>
    {wish.pinned&&<span className="field-hint">Được chủ tiệc ghim</span>}
    <p>{text(wish.message)}</p>
    <div className="wish-item-footer">
     <cite>{oneLine(wish.display_name)}{wishStamp(wish.created_at)&&<span className="wish-time"> · {wishStamp(wish.created_at)}</span>}</cite>
     <button type="button" className={`secondary wish-heart-btn${isLiked?' is-liked':''}`} onClick={()=>void sendHeart(wish.id)} aria-label={`Thả tim lời chúc của ${oneLine(wish.display_name)} (${hearts} lượt thả tim)`}>
      <Heart size={13} aria-hidden="true"/>
      <span>{hearts>0?hearts.toLocaleString('vi-VN'):'Thả tim'}</span>
     </button>
    </div>
   </blockquote>;
  })}</div>
  {items.length>=3&&visibleItems.length===0&&<p className="field-hint">Không tìm thấy lời chúc phù hợp bộ lọc.</p>}
  {busy&&<p role="status" className="field-hint">Đang tải lời chúc…</p>}
  {loaded&&!busy&&items.length===0&&<p className="field-hint">Chưa có lời chúc nào được duyệt.</p>}
  {error&&<p role="alert" className="error">{error}</p>}
  <div className="row wish-feed-actions">{error?<button type="button" className="secondary wish-action-btn" disabled={busy} onClick={()=>void load(retryCursor.current)}>
   <RotateCcw size={14} aria-hidden="true"/>
   <span>{busy?'Đang tải…':'Thử tải lại lời chúc'}</span>
  </button>:cursor&&<button type="button" className="secondary wish-action-btn" disabled={busy} onClick={()=>void load(cursor)}>
   <ChevronDown size={15} aria-hidden="true"/>
   <span>{busy?'Đang tải…':'Xem thêm lời chúc'}</span>
  </button>}
  {loaded&&<button type="button" className="secondary wish-action-btn" disabled={busy} onClick={()=>void load(null)}>
   <RefreshCw size={14} aria-hidden="true"/>
   <span>{busy?'Đang tải…':'Làm mới lời chúc'}</span>
  </button>}</div>
 </div>;
}
