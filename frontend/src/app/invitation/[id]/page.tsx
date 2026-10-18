'use client';
import {use,useEffect,useState} from 'react';
import {api,date} from '@/shared/api';
type Event={id:string;title:string;start_at:string;timezone:string;deadline:string;venue:string;address:string;state:string;max_people:number;status:string|null;total_people:number|null;note:string|null;response_version:number;rsvp_open:boolean};
type Invitation={displayName:string;salutation:string;wedding:{names:string;message:string};events:Event[]};
function RSVP({event,id,reload}:{event:Event;id:string;reload:()=>Promise<void>}) {
 const [status,setStatus]=useState(event.status||'ATTENDING'),[people,setPeople]=useState(event.total_people||1),[note,setNote]=useState(event.note||''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [retry,setRetry]=useState<{payload:string;key:string}|null>(null);
 return <form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');const body={status,totalPeople:status==='DECLINED'?0:people,note,expectedVersion:event.response_version};const payload=JSON.stringify(body),key=retry?.payload===payload?retry.key:crypto.randomUUID();setRetry({payload,key});try{await api(`/guest/invitations/${id}/events/${event.id}/rsvp`,'PUT',body,key);await reload();setRetry(null);setMessage('Đã lưu phản hồi. Cảm ơn bạn!');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}><h3>Xác nhận tham dự</h3>{!event.rsvp_open?<p>Buổi tiệc đã đóng phản hồi. {event.status==='ATTENDING'?`Đã xác nhận ${event.total_people} người.`:event.status==='DECLINED'?'Bạn đã báo không tham dự.':'Chưa có phản hồi.'}</p>:<><label>Lựa chọn của bạn<select value={status} onChange={e=>setStatus(e.target.value)}><option value="ATTENDING">Sẽ tham dự</option><option value="DECLINED">Không thể tham dự</option></select></label>{status==='ATTENDING'&&<label>Tổng số người (tính cả bạn)<input type="number" min={1} max={event.max_people} value={people} onChange={e=>setPeople(Number(e.target.value))} required/></label>}<label>Lời nhắn riêng cho chủ tiệc<textarea maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label><button disabled={busy}>Lưu xác nhận</button></>}{message&&<p role="status">{message}</p>}</form>;
}
export default function InvitationPage({params}:{params:Promise<{id:string}>}) {
 const {id}=use(params);const [data,setData]=useState<Invitation|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setData(await api<Invitation>(`/guest/invitations/${id}`));}
  useEffect(()=>{
    let active=true; setData(null); setBusy(true); setError('');
    async function restore(){
      try {
        const state=await api<{opened:boolean}>(`/guest/invitations/${id}/state`);
        if(state.opened){const invitation=await api<Invitation>(`/guest/invitations/${id}`);if(active)setData(invitation);}
      } catch {if(active)setError('Thiệp hiện không khả dụng hoặc phiên đã hết hạn. Hãy mở lại link/QR gốc hoặc liên hệ người gửi.');}
      finally {if(active)setBusy(false);}
    }
    void restore(); return ()=>{active=false;};
  },[id]);
 return <main className="narrow">{!data?<section className="hero"><p className="eyebrow">Một lời mời dành cho bạn</p><h1>Hẹn gặp bạn<br/>ngày chung đôi.</h1><p>Website ghi nhận thời điểm mở thiệp để người gửi theo dõi lời mời; không công khai lịch sử của bạn.</p><button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await api(`/guest/invitations/${id}/open`,'POST');await load();}catch{setError('Thiệp hiện không khả dụng hoặc phiên đã hết hạn. Hãy mở lại link/QR gốc hoặc liên hệ người gửi.');}finally{setBusy(false);}}}>Mở thiệp</button>{error&&<p role="alert" className="error">{error}</p>}</section>:<><section className="hero"><p className="eyebrow">{data.salutation}</p><h2>{data.displayName}</h2><h1>{data.wedding.names}</h1><p style={{whiteSpace:'pre-line'}}>{data.wedding.message}</p></section>{data.events.map(event=><article className="card" key={event.id}><p className="eyebrow">{event.state==='CANCELLED'?'Buổi tiệc đã hủy':'Hân hạnh đón tiếp'}</p><h2>{event.title}</h2><p>{date(event.start_at,event.timezone)}</p><strong>{event.venue}</strong><p>{event.address}</p><small>Hạn phản hồi: {date(event.deadline,event.timezone)}</small><RSVP event={event} id={id} reload={load}/></article>)}</>}</main>;
}