'use client';
import {useId,useRef,useState} from 'react';
import {api} from '@/shared/api';
import type {WeddingEvent} from '@/shared/admin-types';
import type {EventLocationInput} from '@/shared/invitation-features';
import {parseCoordinates,venueMap} from '@/shared/venue-map';
import {VenueMap} from '@/features/invitation/venue-map';

export function EventLocationForm({event,busy,save}:{event:WeddingEvent;busy:boolean;save:(operation:()=>Promise<unknown>)=>Promise<boolean>}){
 const [latitude,setLatitude]=useState(String(event.latitude??'')),[longitude,setLongitude]=useState(String(event.longitude??'')),[confirmed,setConfirmed]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const errorId=useId(),submitting=useRef(false);
 const preview=venueMap({latitude:latitude.trim()?Number(latitude):null,longitude:longitude.trim()?Number(longitude):null});
 return <details className="event-location-editor"><summary>Vị trí bản đồ trên thiệp</summary>
  <p className="field-hint">Lưu buổi tiệc trước, rồi cấu hình vị trí ở đây. Không tự tìm tọa độ từ địa chỉ. Để trống cả hai tọa độ để tắt bản đồ. Đổi tên địa điểm hoặc địa chỉ sẽ xóa marker cũ và cần xác nhận lại.</p>
  <form aria-describedby={error?errorId:undefined} onSubmit={async e=>{e.preventDefault();if(busy||submitting.current)return;setError('');try{
   const coordinates=parseCoordinates(latitude,longitude);
   if(coordinates.latitude!=null&&!confirmed)throw new Error('Hãy kiểm tra vị trí và xác nhận trước khi lưu.');
   if(event.state==='PUBLISHED'&&!notice.trim())throw new Error('Hãy viết thông báo thay đổi vị trí cho khách.');
   const input:EventLocationInput={latitude:coordinates.latitude??null,longitude:coordinates.longitude??null,confirmed,changeNotice:notice.trim()||null,expectedVersion:event.version};
   submitting.current=true;await save(()=>api(`/admin/events/${event.id}/location`,'PUT',input));
  }catch(e){setError((e as Error).message);}finally{submitting.current=false;}}}>
   <div className="grid"><label>Vĩ độ<input type="number" step="any" min={-90} max={90} value={latitude} disabled={busy} onChange={e=>{setLatitude(e.target.value);setConfirmed(false);}}/></label><label>Kinh độ<input type="number" step="any" min={-180} max={180} value={longitude} disabled={busy} onChange={e=>{setLongitude(e.target.value);setConfirmed(false);}}/></label></div>
   {preview&&<><VenueMap latitude={Number(latitude)} longitude={Number(longitude)} venue={event.venue} address={event.address}/><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/> Tôi đã đối chiếu marker với đúng địa điểm và địa chỉ.</label></>}
   {event.state==='PUBLISHED'&&<label>Thông báo thay đổi vị trí cho khách<textarea required maxLength={500} value={notice} disabled={busy} onChange={e=>setNotice(e.target.value)}/></label>}
   {error&&<p className="error" id={errorId} role="alert">{error}</p>}
   <button disabled={busy}>{busy?'Đang lưu…':'Lưu vị trí bản đồ'}</button>
  </form>
 </details>;
}