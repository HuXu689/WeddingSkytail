'use client';
import {use,useEffect,useRef,useState} from 'react';
import {CheckCircle2,Sparkles} from 'lucide-react';
import {api,date,ApiError} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
import {WeddingCanvas,type WeddingDesign} from '@/features/invitation/design';
import {EventTools} from '@/features/invitation/event-tools';
import {WeddingMonthCalendar} from '@/features/invitation/wedding-month-calendar';
import {guestCalendar} from '@/shared/wedding-calendar';
import {InvitationEntry} from '@/features/invitation/invitation-entry';
import {WishBook} from '@/features/invitation/wish-book';
import {GiftBox} from '@/features/invitation/gift-box';
import {GuestDisclosure} from '@/features/invitation/guest-disclosure';
import {openResponse} from '@/features/invitation/open-response';
import {googleCalendarUrl} from '@/features/invitation/media-fallback';

type Event=import('@/shared/invitation-features').EventCoordinates&{id:string;title:string;start_at:string;timezone:string;deadline:string;venue:string;address:string;state:string;max_people:number;status:string|null;total_people:number|null;note:string|null;event_note:string|null;response_version:number;rsvp_open:boolean;maps_url:string|null;dress_code:string|null;parking:string|null;change_notice:string|null;revision:number};
type Invitation={displayName:string;salutation:string;wedding:WeddingDesign;events:Event[]};

const RSVP_CARE_TAGS=[
 'Thực đơn chay',
 'Có trẻ nhỏ (ghế em bé)',
 'Đi xe ô tô gia đình',
 'Đăng ký xe đưa đón',
] as const;

function toggleCareTag(currentNote:string,tag:string):string{
 const token=`[${tag}]`;
 if(currentNote.includes(token)){
  return currentNote.replace(token,'').replace(/\s{2,}/g,' ').trim();
 }
 const next=currentNote.trim()?`${currentNote.trim()} ${token}`:token;
 return next.slice(0,500);
}

function RSVP({event,id,reload}:{event:Event;id:string;reload:()=>Promise<void>}) {
 const [status,setStatus]=useState(event.status||'ATTENDING'),[people,setPeople]=useState(event.total_people||1),[note,setNote]=useState(text(event.note||'')),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [retry,setRetry]=useState<{payload:string;key:string}|null>(null);
 const submitting=useRef(false);
 // Only server response changes reset the draft; unrelated wish-book reloads must not erase it.
 useEffect(()=>{setStatus(event.status||'ATTENDING');setPeople(event.total_people||1);setNote(text(event.note||''));setRetry(null);},[event.response_version,event.status,event.total_people,event.note]);
 const [tone,setTone]=useState<'success'|'error'>('success');
 const chipTone=event.status==='ATTENDING'?'attending':event.status==='DECLINED'?'declined':'pending';
 const chipLabel=event.status==='ATTENDING'?`Sẽ tham dự ${event.total_people} người`:event.status==='DECLINED'?'Không tham dự':'Chưa phản hồi';
 return <GuestDisclosure id={`response-${event.id}`} title={event.rsvp_open?(event.status?'Sửa phản hồi':'Xác nhận tham dự'):'Xem phản hồi'} hint={!event.rsvp_open?'Buổi tiệc đã đóng phản hồi.':event.status==='ATTENDING'?`Đã xác nhận ${event.total_people} người.`:event.status==='DECLINED'?'Bạn đã báo không tham dự.':'Chưa có phản hồi. Mở để xác nhận khi bạn sẵn sàng.'} chip={<span className={`rsvp-chip ${chipTone}`}>{chipLabel}</span>}>
  <form id={`rsvp-${event.id}`} className="rsvp-form" aria-busy={busy} onSubmit={async e=>{
   e.preventDefault();if(submitting.current)return;submitting.current=true;setBusy(true);setMessage('');
   const body={status,totalPeople:status==='DECLINED'?0:people,note,expectedVersion:event.response_version};
   const payload=JSON.stringify(body),key=retry?.payload===payload?retry.key:crypto.randomUUID();
   setRetry({payload,key});
   try{
    await api(`/guest/invitations/${id}/events/${event.id}/rsvp`,'PUT',body,key);
    await reload();setRetry(null);setTone('success');
    setMessage('Đã lưu phản hồi. Cảm ơn bạn!');
    if(status==='ATTENDING'&&typeof window!=='undefined'){
     window.dispatchEvent(new CustomEvent('wedding:fireworks'));
     window.dispatchEvent(new CustomEvent('wedding:hearts'));
    }
   }catch(error){
    if(error instanceof ApiError&&error.status===409){
     try{await reload();setTone('error');setMessage('Phản hồi của lời mời này vừa được cập nhật ở nơi khác. Máy chủ đã tải lại phản hồi hiện tại; bạn xem lại rồi lưu nếu cần.');}
     catch{setTone('error');setMessage('Phản hồi vừa thay đổi ở nơi khác nhưng chưa tải lại được. Vui lòng mở lại thiệp để xem phản hồi mới nhất trước khi lưu.');}
     setRetry(null);
    }else{setTone('error');setMessage((error as Error).message);}
   }finally{submitting.current=false;setBusy(false);}
  }}>
   <div className="rsvp-heading"><span className="rsvp-icon">✓</span><div><p className="eyebrow">Phản hồi lời mời</p><h3>Xác nhận tham dự</h3></div></div>
   {!event.rsvp_open?<p>Buổi tiệc đã đóng phản hồi. {event.status==='ATTENDING'?`Đã xác nhận ${event.total_people} người.`:event.status==='DECLINED'?'Bạn đã báo không tham dự.':'Chưa có phản hồi.'}</p>:<>
    <label>Lựa chọn của bạn<select disabled={busy} value={status} onChange={e=>setStatus(e.target.value)}><option value="ATTENDING">Sẽ tham dự</option><option value="DECLINED">Không thể tham dự</option></select></label>
    {status==='ATTENDING'&&<div className="rsvp-people-field">
     <label>Tổng số người (tính cả bạn, tối đa {event.max_people})
      <div className="people-stepper">
       <button type="button" className="secondary stepper-btn" disabled={busy||people<=1} aria-label="Giảm số người" onClick={()=>setPeople(p=>Math.max(1,p-1))}>−</button>
       <input disabled={busy} type="number" min={1} max={event.max_people} value={people} onChange={e=>setPeople(Math.max(1,Math.min(event.max_people,Number(e.target.value)||1)))} required/>
       <button type="button" className="secondary stepper-btn" disabled={busy||people>=event.max_people} aria-label="Tăng số người" onClick={()=>setPeople(p=>Math.min(event.max_people,p+1))}>+</button>
      </div>
     </label>
    </div>}
    {status==='ATTENDING'&&<div className="rsvp-care-tags" role="group" aria-label="Chọn nhanh nhu cầu đón tiếp">
     <span className="field-hint"><Sparkles size={13} aria-hidden="true"/> Chọn nhanh lưu ý để gia đình đón tiếp chu đáo hơn:</span>
     <div className="rsvp-care-tag-list">
      {RSVP_CARE_TAGS.map(tag=>{
       const active=note.includes(`[${tag}]`);
       return <button type="button" key={tag} className={`secondary rsvp-care-chip${active?' is-selected':''}`} aria-pressed={active} disabled={busy} onClick={()=>setNote(cur=>toggleCareTag(cur,tag))}>{active?'✓ ':''}{tag}</button>;
      })}
     </div>
    </div>}
    <label>Lời nhắn riêng cho chủ tiệc<textarea disabled={busy} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ví dụ: Gia đình có trẻ nhỏ / dùng thực đơn chay, hoặc lời nhắn riêng…"/></label>
    <button disabled={busy}>{busy?'Đang lưu…':'Lưu xác nhận'} <span aria-hidden="true">→</span></button>
   </>}
   {message&&<p role="status" className={`rsvp-message ${tone}`}>{message}</p>}
  </form>
 </GuestDisclosure>;
}

export default function InvitationPage({params}:{params:Promise<{id:string}>}) {
 const {id}=use(params);return <InvitationContent key={id} id={id}/>;
}

function InvitationContent({id}:{id:string}) {
 const [data,setData]=useState<Invitation|null>(null);
 const [ceremonyEntrance,setCeremonyEntrance]=useState(false);
 const [copiedEventId,setCopiedEventId]=useState<string>('');
 /** Số thứ tự thật của buổi tiệc đang phát hành; không đưa index thô của mảng ra UI (L1). */
 const publishedIndex=new Map((data?.events??[]).filter(item=>item.state==='PUBLISHED').map((item,index)=>[item.id,index+1]));
 async function load(){setData(await api<Invitation>(`/guest/invitations/${id}`));}
 async function copyAddress(event:Event){
  const full=`${oneLine(event.venue)}, ${oneLine(event.address)}`;
  try{
   await navigator.clipboard.writeText(full);
   setCopiedEventId(event.id);
   window.setTimeout(()=>setCopiedEventId(cur=>cur===event.id?'':cur),2400);
  }catch{}
 }
 return <main className={`invitation-page ${data?'invitation-open':'invitation-gate'}`}>{!data?<InvitationEntry<Invitation> key={id} id={id} onOpened={(val,fromSeal)=>{setCeremonyEntrance(Boolean(fromSeal));setData(val);}}/>:<WeddingCanvas initiallyOpen ceremonyEntrance={ceremonyEntrance} calendar={<WeddingMonthCalendar items={guestCalendar(data.events,id)}/>} gift={<GiftBox scope={{kind:'guest',invitationId:id}}/>} wishes={<WishBook id={id} reload={load}/>} design={data.wedding} recipient={oneLine(data.displayName)} salutation={oneLine(data.salutation)} countdownTo={data.events.filter(item=>item.state==='PUBLISHED'&&new Date(item.start_at).getTime()>Date.now()).map(item=>item.start_at).sort()[0]??null}>{data.events.length>0?<>
  {data.events.some(item=>item.state==='PUBLISHED')&&<section className="rsvp-summary reveal"><p className="eyebrow">Phản hồi của bạn</p><strong>Đã phản hồi {data.events.filter(item=>item.state==='PUBLISHED'&&item.status).length}/{data.events.filter(item=>item.state==='PUBLISHED').length} buổi tiệc</strong><div className="row">{data.events.filter(item=>item.state==='PUBLISHED').map(item=><a className="button secondary" key={item.id} href={`#response-${item.id}`} onClick={e=>{e.preventDefault();openResponse(item.id);}}>{item.status?'Sửa phản hồi':'Xác nhận tham dự'} · {oneLine(item.title)}</a>)}</div></section>}
  {data.events.map(event=><article className="event-card" key={event.id}>
   <div className="event-number" aria-hidden="true">{event.state==='CANCELLED'?'×':(publishedIndex.get(event.id)??'•')}</div>
   <div className="event-content">
    <span className="sr-only">{event.state==='CANCELLED'?'Buổi tiệc đã hủy':`Buổi tiệc thứ ${publishedIndex.get(event.id)??1}`}</span>
    <p className="eyebrow">{event.state==='CANCELLED'?'Buổi tiệc đã hủy':'Hân hạnh đón tiếp'}</p>
    <h2>{oneLine(event.title)}</h2>
    <p className="event-date">{date(event.start_at,event.timezone)}</p>
    <div className="event-place"><strong>{oneLine(event.venue)}</strong><span>{oneLine(event.address)}</span></div>
    <div className="event-actions-bar">
     {event.maps_url&&<a className="button secondary map-button" href={event.maps_url} target="_blank" rel="noreferrer">Xem đường đi ↗</a>}
     <button type="button" className="secondary address-copy-btn" onClick={()=>void copyAddress(event)}>{copiedEventId===event.id?'Đã chép địa chỉ ✓':'Sao chép địa chỉ'}</button>
     {event.state==='PUBLISHED'&&<a className="button secondary calendar-button" href={`/api/v1/guest/invitations/${id}/events/${event.id}/calendar.ics`}>Thêm vào lịch</a>}
     {event.state==='PUBLISHED'&&<a className="button secondary gcal-button" href={googleCalendarUrl({title:event.title,start:event.start_at,venue:event.venue,address:event.address})} target="_blank" rel="noreferrer">Lịch Google ↗</a>}
    </div>
    {event.state==='PUBLISHED'&&event.status==='ATTENDING'&&<div className="wedding-pass-card" role="note" aria-label="Thẻ xác nhận tham dự của bạn">
     <div className="wedding-pass-head">
      <CheckCircle2 size={18} aria-hidden="true"/>
      <strong>Thẻ hẹn chung vui · {oneLine(data.displayName)}</strong>
     </div>
     <p>Gia đình hân hạnh đón tiếp <strong>{event.total_people} khách</strong> tại {oneLine(event.venue)} vào {date(event.start_at,event.timezone)}.</p>
    </div>}
    {event.revision>0&&<p className="event-change">Buổi tiệc vừa được cập nhật{event.change_notice?`: ${text(event.change_notice)}`:''}</p>}
    {event.dress_code&&<p className="event-note"><strong>Trang phục:</strong> {oneLine(event.dress_code)}</p>}
    {event.parking&&<p className="event-note"><strong>Chỗ đỗ xe:</strong> {text(event.parking)}</p>}
    <EventTools start={event.start_at} timezone={event.timezone} venue={oneLine(event.venue)} address={oneLine(event.address)} latitude={event.latitude} longitude={event.longitude}/>
    {event.event_note&&<p className="event-note">{text(event.event_note)}</p>}
    <small className="event-deadline">Hạn phản hồi: {date(event.deadline,event.timezone)}</small>
    <RSVP event={event} id={id} reload={load}/>
   </div>
  </article>)}
 </>:undefined}</WeddingCanvas>}</main>;
}
