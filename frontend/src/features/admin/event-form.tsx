'use client';
import {useState} from 'react';
import type {WeddingEvent} from '@/shared/admin-types';
import {fromVietnamInput,toVietnamInput} from '@/shared/time';
import {cleanMapUrlInput} from '@/features/invitation/media-fallback';

export function EventForm({event,revise=false,busy,save}:{event?:WeddingEvent;revise?:boolean;busy:boolean;save:(body:unknown)=>Promise<boolean>}){
 const [error,setError]=useState('');
 const [mapsValue,setMapsValue]=useState(()=>cleanMapUrlInput(event?.maps_url??''));
 return <form onSubmit={async e=>{e.preventDefault();setError('');const form=e.currentTarget;const f=new FormData(form);try{
  const startAt=fromVietnamInput(String(f.get('start'))),deadline=fromVietnamInput(String(f.get('deadline')));
  if(deadline>startAt)throw new Error('Hạn phản hồi phải trước hoặc bằng giờ khai tiệc.');
  const cleanedMaps=cleanMapUrlInput(mapsValue);
  if(cleanedMaps&&!cleanedMaps.startsWith('https://'))throw new Error('Liên kết bản đồ phải bắt đầu bằng https://.');
  const ok=await save({title:f.get('title'),venue:f.get('venue'),address:f.get('address'),startAt,deadline,timezone:'Asia/Ho_Chi_Minh',capacity:Number(f.get('capacity')),mapsUrl:cleanedMaps,dressCode:f.get('dress'),parking:f.get('parking'),note:f.get('note'),changeNotice:f.get('notice'),expectedVersion:event?.version??0});
  if(ok&&!event){form.reset();setMapsValue('');}
 }catch(e){setError((e as Error).message);}}}>
 <p className="field-hint">Tất cả ngày giờ bên dưới là giờ Việt Nam (UTC+07:00).</p><div className="grid"><label>Tên buổi tiệc<input name="title" required maxLength={200} defaultValue={event?.title}/></label><label>Địa điểm tổ chức<input name="venue" required maxLength={200} defaultValue={event?.venue}/></label><label>Giờ khai tiệc<input name="start" type="datetime-local" step="1" required defaultValue={toVietnamInput(event?.start_at??null)}/></label><label>Hạn phản hồi<input name="deadline" type="datetime-local" step="1" required defaultValue={toVietnamInput(event?.deadline??null)}/></label><label>Địa chỉ<input name="address" required maxLength={500} defaultValue={event?.address}/></label><label>Sức chứa dự kiến<input name="capacity" type="number" min={1} defaultValue={event?.capacity??200} required/></label></div><div className="grid"><label>Liên kết bản đồ (bắt đầu bằng https://)<input name="maps" type="url" maxLength={500} placeholder="https://maps.google.com/…" value={mapsValue} onChange={e=>setMapsValue(e.target.value)} onBlur={e=>setMapsValue(cleanMapUrlInput(e.target.value))}/></label><label>Trang phục gợi ý<textarea name="dress" rows={2} maxLength={200} defaultValue={event?.dress_code??''}/></label><label>Chỗ đỗ xe và lưu ý đi lại<textarea name="parking" rows={2} maxLength={500} defaultValue={event?.parking??''}/></label><label>Ghi chú cho khách<textarea name="note" rows={2} maxLength={500} defaultValue={event?.note??''}/></label></div>{revise&&<label>Thông báo thay đổi gửi tới khách<textarea name="notice" rows={2} maxLength={500} placeholder="Ví dụ: Giờ khai tiệc đổi sang 18:30, địa điểm giữ nguyên."/></label>}{error&&<p className="error" role="alert">{error}</p>}<button disabled={busy}>{busy?'Đang lưu…':revise?'Phát hành phiên bản mới':event?'Lưu chỉnh sửa bản nháp':'Tạo buổi tiệc nháp'}</button></form>;
}
