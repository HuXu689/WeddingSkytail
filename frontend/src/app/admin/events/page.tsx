'use client';
import {useState} from 'react';
import Link from 'next/link';
import {api,date} from '@/shared/api';
import type {WeddingEvent} from '@/shared/admin-types';
import {useAdmin,useAdminRole} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Empty,Badge,Confirm} from '@/features/admin/ui';
import {EventForm} from '@/features/admin/event-form';
import {EventLocationForm} from '@/features/admin/event-location-form';
export default function Events(){
 const {isOwner,isEditor}=useAdminRole();
 const state=useAdmin<WeddingEvent[]>('/admin/events');
 const [cancel,setCancel]=useState<WeddingEvent|null>(null),[cancelReason,setCancelReason]=useState(''),[filter,setFilter]=useState<'ALL'|'PUBLISHED'|'DRAFT'|'CANCELLED'>('ALL');
 const visible=(state.data??[]).filter(event=>filter==='ALL'||event.state===filter);
 return <><Heading title="Những buổi hẹn chung vui" description="Mỗi buổi tiệc có thời gian, địa điểm và phản hồi riêng. Chỉ buổi được gán và đã phát hành mới xuất hiện trong thiệp khách."/>
  {isEditor&&<p className="field-hint card">Bạn đang ở vai trò <strong>Trợ lý nội dung</strong>: có thể tạo, sửa bản nháp, phát hành phiên bản hoặc cập nhật bản đồ; chỉ <strong>Chủ tiệc</strong> mới phát hành buổi mới, hủy buổi tiệc hoặc tải báo cáo CSV.</p>}
  <Feedback {...state} retry={()=>void state.reload().catch(()=>{})}/>
  <section className="card"><h2>Thêm buổi tiệc</h2><EventForm busy={state.busy} save={body=>state.run(()=>api('/admin/events','POST',body),'Đã tạo buổi tiệc nháp.')}/></section>
  {state.data&&state.data.length>0&&<div className="media-filter-tabs" role="tablist" aria-label="Lọc trạng thái buổi tiệc">
   <button type="button" role="tab" aria-selected={filter==='ALL'} className={filter==='ALL'?'':'secondary'} onClick={()=>setFilter('ALL')}>Tất cả ({state.data.length})</button>
   <button type="button" role="tab" aria-selected={filter==='PUBLISHED'} className={filter==='PUBLISHED'?'':'secondary'} onClick={()=>setFilter('PUBLISHED')}>Đã phát hành ({state.data.filter(e=>e.state==='PUBLISHED').length})</button>
   <button type="button" role="tab" aria-selected={filter==='DRAFT'} className={filter==='DRAFT'?'':'secondary'} onClick={()=>setFilter('DRAFT')}>Bản nháp ({state.data.filter(e=>e.state==='DRAFT').length})</button>
   <button type="button" role="tab" aria-selected={filter==='CANCELLED'} className={filter==='CANCELLED'?'':'secondary'} onClick={()=>setFilter('CANCELLED')}>Đã hủy ({state.data.filter(e=>e.state==='CANCELLED').length})</button>
  </div>}
  {!state.data&&!state.error&&<Loading/>}
  {state.data&&visible.length===0&&<Empty>{state.data.length===0?'Chưa có buổi tiệc. Điền thông tin ở trên để bắt đầu.':'Không có buổi tiệc nào ở trạng thái đã chọn.'}</Empty>}
  {visible.map(event=><section className="card" key={event.id}>
   <div className="section-heading"><div><h2>{event.title}</h2><p className="field-hint">Mã nhập CSV: <strong>{event.event_code}</strong></p></div><Badge value={event.state}/></div>
   {event.state==='DRAFT'&&<p className="warning">Buổi tiệc đang ở trạng thái <strong>Bản nháp</strong> — khách nhận link sẽ chưa nhìn thấy buổi này cho tới khi Chủ tiệc bấm <strong>Phát hành</strong>.</p>}
   <p>{date(event.start_at,event.timezone)}</p>
   <strong>{event.venue}</strong>
   <p className="muted">{event.address}</p>
   <p className="field-hint">Hạn phản hồi: {date(event.deadline,event.timezone)} · Sức chứa: {event.capacity} người</p>
   {event.state==='DRAFT'&&<details><summary>Chỉnh sửa bản nháp</summary><EventForm key={event.version} event={event} busy={state.busy} save={body=>state.run(()=>api(`/admin/events/${event.id}/draft`,'PUT',body),'Đã lưu chỉnh sửa bản nháp.')}/></details>}
   <div className="row">
    {isOwner&&event.state==='DRAFT'&&<button disabled={state.busy} onClick={()=>void state.run(()=>api(`/admin/events/${event.id}/publish`,'POST',{expectedVersion:event.version}),'Đã phát hành buổi tiệc.')}>Phát hành</button>}
    {isOwner&&event.state!=='CANCELLED'&&<button disabled={state.busy} className="secondary" onClick={()=>{setCancelReason('');setCancel(event);}}>Hủy buổi tiệc</button>}
    <Link className="button secondary" href={`/admin/invitations?eventId=${event.id}`}>Khách được mời →</Link>
    {event.state==='PUBLISHED'&&<Link className="button secondary" href={`/admin/reminders?eventId=${event.id}`}>Nhắc RSVP →</Link>}
   </div>
   {event.maps_url&&<p className="field-hint">Bản đồ: <a href={event.maps_url} target="_blank" rel="noreferrer">Mở liên kết bản đồ ↗</a></p>}
   {event.dress_code&&<p className="field-hint">Trang phục: {event.dress_code}</p>}
   {event.parking&&<p className="field-hint">Đỗ xe và lưu ý đi lại: {event.parking}</p>}
   {event.note&&<p className="field-hint">Ghi chú cho khách: {event.note}</p>}
   {event.revision>0&&<p className="field-hint">Đã chỉnh sửa {event.revision} lần sau khi phát hành{event.change_notice?` · Thông báo gần nhất: ${event.change_notice}`:''}</p>}
   {event.state==='CANCELLED'&&<p className="error">Buổi tiệc đã hủy{event.cancel_reason?` — lý do: ${event.cancel_reason}`:''}.</p>}
   {event.state==='PUBLISHED'&&<details><summary>Phát hành phiên bản mới</summary><p className="field-hint">Buổi tiệc đã phát hành vẫn sửa được, nhưng phải kèm thông báo thay đổi khi bạn đổi giờ hoặc địa điểm. Link và QR của khách không thay đổi.</p><EventForm revise event={event} busy={state.busy} save={body=>state.run(()=>api(`/admin/events/${event.id}/revise`,'PUT',body),'Đã phát hành phiên bản mới cho buổi tiệc.')}/></details>}
   {event.state!=='CANCELLED'&&<EventLocationForm key={`${event.id}:${event.version}`} event={event} busy={state.busy} save={operation=>state.run(operation,'Đã lưu vị trí bản đồ.')}/>}
   {isOwner&&<div className="row action-row"><a className="button secondary" href={`/api/v1/admin/reports/guests.csv?eventId=${event.id}`}>Tải danh sách khách (CSV)</a><a className="button secondary" href={`/api/v1/admin/reports/responses.csv?eventId=${event.id}`}>Tải phản hồi (CSV)</a></div>}
  </section>)}
  {cancel&&<Confirm title="Hủy buổi tiệc này?" busy={state.busy} onClose={()=>setCancel(null)} onConfirm={async()=>{if(await state.run(()=>api(`/admin/events/${cancel.id}/cancel`,'POST',{reason:cancelReason.trim(),expectedVersion:cancel.version}),'Đã hủy buổi tiệc.'))setCancel(null);}}><label>Lý do hủy (bắt buộc, chỉ chủ tiệc nhìn thấy)<textarea rows={2} maxLength={500} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Ví dụ: Nhà hàng báo trùng lịch, gia đình sẽ hẹn lại sau."/></label>Khách sẽ thấy thông báo hủy và không thể phản hồi. Phản hồi cũ được giữ trong lịch sử. Thao tác này không có nút hoàn tác.</Confirm>}
 </>;
}