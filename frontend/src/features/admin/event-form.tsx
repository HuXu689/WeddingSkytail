'use client';
import {useState} from 'react';
import type {WeddingEvent} from '@/shared/admin-types';
import {fromVietnamInput,toVietnamInput} from '@/shared/time';
export function EventForm({event,busy,save}:{event?:WeddingEvent;busy:boolean;save:(body:unknown)=>Promise<boolean>}){
 const [error,setError]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();setError('');const form=e.currentTarget;const f=new FormData(form);try{
  const startAt=fromVietnamInput(String(f.get('start'))),deadline=fromVietnamInput(String(f.get('deadline')));
  if(deadline>startAt)throw new Error('Hạn phản hồi phải trước hoặc bằng giờ khai tiệc.');
  const ok=await save({title:f.get('title'),venue:f.get('venue'),address:f.get('address'),startAt,deadline,timezone:'Asia/Ho_Chi_Minh',capacity:Number(f.get('capacity')),expectedVersion:event?.version??0});
  if(ok&&!event)form.reset();
 }catch(e){setError((e as Error).message);}}}>
 <p className="field-hint">Tất cả ngày giờ bên dưới là giờ Việt Nam (UTC+07:00).</p><div className="grid"><label>Tên buổi tiệc<input name="title" required maxLength={200} defaultValue={event?.title}/></label><label>Địa điểm tổ chức<input name="venue" required maxLength={200} defaultValue={event?.venue}/></label><label>Giờ khai tiệc<input name="start" type="datetime-local" step="1" required defaultValue={toVietnamInput(event?.start_at??null)}/></label><label>Hạn phản hồi<input name="deadline" type="datetime-local" step="1" required defaultValue={toVietnamInput(event?.deadline??null)}/></label><label>Địa chỉ<input name="address" required maxLength={500} defaultValue={event?.address}/></label><label>Sức chứa dự kiến<input name="capacity" type="number" min={1} defaultValue={event?.capacity??200} required/></label></div>{error&&<p className="error" role="alert">{error}</p>}<button disabled={busy}>{busy?'Đang lưu…':event?'Lưu chỉnh sửa bản nháp':'Tạo buổi tiệc nháp'}</button></form>;
}