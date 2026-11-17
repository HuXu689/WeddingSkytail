'use client';
import {useCallback,useEffect,useState} from 'react';
import type {Invitation,WeddingEvent} from '@/shared/admin-types';
import {api} from '@/shared/api';
type Assignment={event_id:string;max_people:number};
export function GuestEditForm({invitation,events,busy,save}:{invitation:Invitation;events:WeddingEvent[];busy:boolean;save:(body:unknown)=>Promise<boolean>}){
 const [selected,setSelected]=useState<Record<string,number>>({});
 const [error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const load=useCallback(()=>{
  setLoaded(false);setError('');
  api<Assignment[]>(`/admin/invitations/${invitation.id}/assignments`)
   .then(items=>{
    const map:Record<string,number>={};
    for(const item of items)map[item.event_id]=item.max_people||2;
    setSelected(map);
    setLoaded(true);
   })
   .catch(()=>setError('Không thể tải các buổi đã gán. Nút lưu đang tạm khóa để không làm mất buổi tiệc.'));
 },[invitation.id]);
 useEffect(()=>{void load();},[load]);

 function toggleEvent(eventId:string,checked:boolean){
  setSelected(prev=>{
   if(!checked){const next={...prev};delete next[eventId];return next;}
   return {...prev,[eventId]:prev[eventId]??2};
  });
 }
 function setMax(eventId:string,value:number){
  const safe=Math.max(1,Math.min(20,Number.isFinite(value)?value:2));
  setSelected(prev=>eventId in prev?{...prev,[eventId]:safe}:prev);
 }

 return <form onSubmit={async e=>{
  e.preventDefault();setError('');
  if(!loaded){setError('Vui lòng chờ tải xong các buổi đã gán trước khi lưu.');return;}
  const f=new FormData(e.currentTarget);
  const assignments=events
   .filter(x=>x.state!=='CANCELLED' && Object.prototype.hasOwnProperty.call(selected,x.id))
   .map(x=>({eventId:x.id,maxPeople:selected[x.id]||2}));
  if(!assignments.length){setError('Vui lòng giữ ít nhất một buổi tiệc.');return;}
  await save({displayName:f.get('name'),groupName:f.get('group'),salutation:f.get('salutation'),internalNote:f.get('note'),assignments,expectedVersion:invitation.version});
 }}>
  <div className="grid">
   <label>Tên người nhận / gia đình<input name="name" defaultValue={invitation.display_name} required maxLength={200}/></label>
   <label>Xưng hô<input name="salutation" defaultValue={invitation.salutation} list="edit-salutations" required maxLength={80}/><datalist id="edit-salutations"><option value="Kính mời"/><option value="Trân trọng kính mời"/><option value="Thân mời"/></datalist></label>
   <label>Nhãn nhóm<input name="group" defaultValue={invitation.group_name} maxLength={100}/></label>
  </div>
  <label>Ghi chú nội bộ<textarea name="note" defaultValue={invitation.internal_note} maxLength={1000} placeholder="Chỉ chủ tiệc nhìn thấy"/></label>
  <fieldset><legend>Buổi được mời và số người tối đa</legend>
   {events.filter(x=>x.state!=='CANCELLED').map(event=>{
    const isChecked=Object.prototype.hasOwnProperty.call(selected,event.id);
    return <div className="assignment-row" key={event.id}>
     <label><input type="checkbox" checked={isChecked} disabled={!loaded} onChange={e=>toggleEvent(event.id,e.target.checked)}/>{event.title} <span className="field-hint">({event.state==='PUBLISHED'?'Đã phát hành':'Bản nháp'})</span></label>
     <label>Tối đa<input type="number" min={1} max={20} value={isChecked?selected[event.id]:2} disabled={!loaded||!isChecked} onChange={e=>setMax(event.id,Number(e.target.value))}/></label>
    </div>;
   })}
  </fieldset>
  {!loaded&&!error&&<p className="field-hint" role="status">Đang tải các buổi đã gán…</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {error&&<button type="button" className="secondary" disabled={busy} onClick={()=>void load()}>Thử tải lại các buổi đã gán</button>}
  <button disabled={busy||!loaded}>{busy?'Đang lưu…':'Lưu thay đổi khách'}</button>
 </form>;
}