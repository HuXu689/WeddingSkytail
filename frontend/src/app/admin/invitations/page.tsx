'use client';
import {useEffect,useRef,useState} from 'react';
import {api,date} from '@/shared/api';
import {label} from '@/shared/labels';
import type {Invitation,WeddingEvent} from '@/shared/admin-types';
import {useAdmin,useAdminRole} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Empty,Badge,Confirm} from '@/features/admin/ui';
import {PolicyForm} from '@/features/admin/policy-form';
import {GuestForm} from '@/features/admin/guest-form';
import {GuestEditForm} from '@/features/admin/guest-edit-form';
import {BulkPolicyPanel} from '@/features/admin/bulk-policy-panel';
import {PinPanel} from '@/features/admin/pin-panel';
import {QuickPublicSharePanel} from '@/features/admin/quick-public-share';
const ACCESS_STATES=['OPEN','NOT_YET_OPEN','CLOSED_SCHEDULE','CLOSED_MANUAL','CLOSED_GLOBAL','REVOKED'] as const;
export default function Invitations(){
 const {isOwner,isEditor}=useAdminRole();
 const [page,setPage]=useState(0),[query,setQuery]=useState(''),[archived,setArchived]=useState(false),[editing,setEditing]=useState<Invitation|null>(null),[link,setLink]=useState<{id:string;name:string;salutation:string;assigned:string;accessState:string;url:string}|null>(null),[copied,setCopied]=useState<'link'|'invite'|''>(''),[pending,setPending]=useState<{invitation:Invitation;action:'revoke'|'rotate'|'archive'}|null>(null);
 const [eventFilter,setEventFilter]=useState(''),[statusFilter,setStatusFilter]=useState(''),[accessFilter,setAccessFilter]=useState(''),[openFilter,setOpenFilter]=useState('');
 const [selected,setSelected]=useState<string[]>([]);
 const [addOpen,setAddOpen]=useState(false);
 const linkPanelRef=useRef<HTMLElement>(null);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  setAddOpen(params.get('create')==='1');
  if(params.get('openFilter')==='NO_OPEN')setOpenFilter('NO_OPEN');
  const evt=params.get('eventId');
  if(evt)setEventFilter(evt);
 },[]);
 useEffect(()=>{
  if(link)linkPanelRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'});
 },[link]);
 const state=useAdmin<Invitation[]>(`/admin/invitations?page=${page}&archived=${archived}${query?`&query=${encodeURIComponent(query)}`:''}${eventFilter?`&eventId=${eventFilter}`:''}${statusFilter?`&responseStatus=${statusFilter}`:''}${accessFilter?`&accessState=${accessFilter}`:''}${openFilter?`&openFilter=${openFilter}`:''}`),events=useAdmin<WeddingEvent[]>('/admin/events');
 const pendingTitle=pending?(pending.action==='revoke'?'Thu hồi lời mời?':pending.action==='rotate'?'Tạo link và QR mới cho lời mời?':'Lưu trữ lời mời?'):'';
 const pendingBody=pending?(pending.action==='revoke'?'Thu hồi link sẽ chặn cả những phiên đang mở của lời mời này. Phản hồi RSVP vẫn được giữ nguyên. Ảnh QR đã in sẽ không dùng được nữa.':pending.action==='rotate'?'Link và QR cũ sẽ mất hiệu lực ngay, kể cả ảnh QR đã in và đã gửi cho khách. Chỉ tạo link mới khi bạn thật sự cần. Phản hồi RSVP và các buổi tiệc được gán vẫn được giữ nguyên.':'Khách sẽ được ẩn khỏi thiệp và danh sách mặc định. Phản hồi RSVP, link và token cũ vẫn được giữ lại, có thể khôi phục sau.'):'';
 const inviteMessage=link?`${link.salutation} ${link.name} đến chung vui trong ngày trọng đại của chúng mình. Mở lời mời riêng và xác nhận tham dự tại: ${link.url}`:'';
 return <><Heading title="Khách mời và lời mời" description="Quản lý thông tin khách, buổi được gán và trạng thái link mà không làm thay đổi quyền RSVP."/>
  {isEditor&&<p className="field-hint card">Bạn đang ở vai trò <strong>Trợ lý nội dung</strong>: có thể thêm/sửa thông tin khách và đánh dấu đã gửi; chỉ <strong>Chủ tiệc</strong> mới xem được link riêng, mã QR, mã PIN và chính sách truy cập.</p>}
  <Feedback {...state} retry={()=>void state.reload().catch(()=>{})}/>
  <section className="card"><details id="add-guest" open={addOpen} onToggle={e=>setAddOpen(e.currentTarget.open)}><summary>＋ Thêm khách / gia đình</summary><Feedback error={events.error} notice="" retry={()=>void events.reload().catch(()=>{})}/>{events.data?<GuestForm events={events.data} busy={state.busy} save={body=>state.run(()=>api('/admin/guests','POST',body),'Đã tạo lời mời. Bạn có thể lấy link và QR bên dưới.')}/>:<Loading/>}</details></section>
  <QuickPublicSharePanel/>
  {link&&<section ref={linkPanelRef} className="card link-panel">
   <div className="section-heading"><div><p className="eyebrow">Liên kết và QR riêng</p><h2>Lời mời: {link.name}</h2></div><Badge value={link.accessState}/></div>
   {link.accessState!=='OPEN'&&<p className="warning">Trạng thái hiện tại là <strong>{label(link.accessState)}</strong> — khách có thể chưa mở được thiệp cho tới khi lời mời hoặc chính sách chung chuyển sang Đang mở.</p>}
   <div className="link-panel-grid">
    <div className="link-panel-details">
     <label>Link riêng — chỉ gửi cho người được mời<input readOnly value={link.url} onFocus={e=>e.target.select()}/></label>
     <label>Tin nhắn mời gợi ý (dán gửi Zalo / Messenger)<textarea readOnly rows={2} value={inviteMessage} onFocus={e=>e.target.select()}/></label>
     <div className="row">
      <button onClick={async()=>{try{await navigator.clipboard.writeText(link.url);setCopied('link');}catch{state.setError('Không thể sao chép tự động. Hãy chọn và sao chép link thủ công.');}}}>{copied==='link'?'Đã sao chép link ✓':'Sao chép link'}</button>
      <button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(inviteMessage);setCopied('invite');}catch{state.setError('Không thể sao chép tin nhắn. Hãy chọn và sao chép thủ công.');}}}>{copied==='invite'?'Đã sao chép tin nhắn ✓':'Sao chép kèm lời mời'}</button>
      <a className="button secondary" href={link.url} target="_blank" rel="noreferrer">Mở thử link ↗</a>
      <a className="button secondary" href={`/api/v1/admin/invitations/${link.id}/qr.png`} download={`qr-${link.id.slice(0,8)}.png`}>Tải QR PNG</a>
      <button className="secondary" onClick={()=>setLink(null)}>Ẩn khung</button>
     </div>
    </div>
    <div className="link-panel-qr">
     <img src={`/api/v1/admin/invitations/${link.id}/qr.png`} alt={`Mã QR của ${link.name}`} width={148} height={148}/>
     <small>Quét bằng camera để mở thiệp</small>
    </div>
   </div>
  </section>}
  <div className="toolbar">
   <label>Tìm khách<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Tên, nhóm hoặc ghi chú nội bộ"/></label>
   <label><input type="checkbox" checked={archived} onChange={e=>{setArchived(e.target.checked);setPage(0);}}/> Hiện khách đã lưu trữ</label>
   <label>Buổi tiệc<select value={eventFilter} onChange={e=>{setEventFilter(e.target.value);if(!e.target.value&&openFilter==='OPENED_NO_RESPONSE')setOpenFilter('');setPage(0);}}><option value="">Tất cả buổi tiệc</option>{events.data?.map(event=><option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
   <label>Trạng thái truy cập<select value={accessFilter} onChange={e=>{setAccessFilter(e.target.value);setPage(0);}}><option value="">Tất cả trạng thái</option>{ACCESS_STATES.map(value=><option key={value} value={value}>{label(value)}</option>)}</select></label>
   <label>Phản hồi<select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(0);}}><option value="">Tất cả phản hồi</option><option value="ATTENDING">Sẽ tham dự</option><option value="DECLINED">Không thể tham dự</option></select></label>
   <label>Lượt mở thiệp<select value={openFilter} onChange={e=>{const next=e.target.value;if(next==='OPENED_NO_RESPONSE'&&!eventFilter&&events.data?.length){setEventFilter(events.data[0].id);}setOpenFilter(next);setPage(0);}}><option value="">Không lọc theo lượt mở</option><option value="NO_OPEN">Chưa ghi nhận mở</option><option value="OPENED">Đã ghi nhận mở</option><option value="OPENED_NO_RESPONSE" disabled={!events.data?.length}>Đã mở nhưng chưa phản hồi buổi đã chọn</option></select></label>
   {isOwner&&<><span className="muted">Đã chọn {selected.length} lời mời · tối đa 50 lời mời / trang</span><button type="button" className="secondary" disabled={!state.data||state.data.length===0} onClick={()=>setSelected(selected.length>0&&selected.length===(state.data?.length??0)?[]:(state.data??[]).map(item=>item.id))}>{selected.length>0&&selected.length===(state.data?.length??0)?'Bỏ chọn tất cả trên trang':'Chọn tất cả trên trang'}</button></>}
  </div>
  <p className="field-hint">Lưu trữ chỉ ẩn khách khỏi thiệp và danh sách mặc định; không xóa RSVP hoặc token cũ. “Chưa ghi nhận mở” chỉ là chưa có lượt bấm mở trên website, không khẳng định khách chưa nhận hay chưa đọc thiệp.</p>
  {isOwner&&selected.length>0&&<BulkPolicyPanel ids={selected} onClear={()=>setSelected([])} onDone={()=>state.reload()}/>}
  {!state.data&&!state.error&&<Loading/>}
  {state.data?.length===0&&<Empty>Không có lời mời phù hợp.</Empty>}
  {state.data?.map(invitation=><section className="card" key={invitation.id}>
   {isOwner&&<label className="select-row"><input type="checkbox" checked={selected.includes(invitation.id)} onChange={()=>setSelected(items=>items.includes(invitation.id)?items.filter(value=>value!==invitation.id):items.concat(invitation.id))}/> Chọn lời mời này để thao tác hàng loạt</label>}
   <div className="section-heading"><div><p className="eyebrow">{invitation.group_name||'Lời mời riêng'}</p><h2>{invitation.display_name}</h2></div><div className="row"><Badge value={invitation.access_state}/>{invitation.archived&&<Badge value="ARCHIVED"/>}</div></div>
   <p>{invitation.sent?'✓ Đã đánh dấu gửi':'Chưa đánh dấu gửi'}{invitation.first_opened_at?` · Đã ghi nhận mở (${invitation.open_count} lượt)`:' · Chưa ghi nhận mở'}</p>
   {invitation.assigned_events&&<p className="field-hint">Buổi được mời: {invitation.assigned_events}</p>}
   <p className="field-hint">Phản hồi: {invitation.attending_events} buổi đồng ý · {invitation.declined_events} buổi từ chối · {invitation.confirmed_people} người đã xác nhận</p>
   {invitation.internal_note&&<p className="field-hint">Ghi chú nội bộ: {invitation.internal_note}</p>}
   {invitation.first_opened_at&&<small>Lần đầu: {date(invitation.first_opened_at)} · Gần nhất: {date(invitation.last_opened_at!)}</small>}
   <div className="row action-row">
    <button className="secondary" onClick={()=>setEditing(editing?.id===invitation.id?null:invitation)}>{editing?.id===invitation.id?'Đóng chỉnh sửa':'Chỉnh sửa khách'}</button>
    {isOwner&&<button disabled={state.busy||!invitation.active||invitation.archived} onClick={()=>void state.run(async()=>{const result=await api<{url:string}>(`/admin/invitations/${invitation.id}/link-reveal`,'POST');setLink({id:invitation.id,name:invitation.display_name,salutation:invitation.salutation,assigned:invitation.assigned_events||'',accessState:invitation.access_state,url:result.url});setCopied('');},'Link và QR đã sẵn sàng ở khung Liên kết.')}>Lấy link &amp; QR</button>}
    {isOwner&&invitation.active&&!invitation.archived&&<a className="button secondary" href={`/api/v1/admin/invitations/${invitation.id}/qr.png`} target="_blank" rel="noreferrer">Tải QR PNG ↗</a>}
    <button disabled={state.busy||invitation.sent} className="secondary" onClick={()=>void state.run(()=>api(`/admin/invitations/${invitation.id}/sent`,'POST',{expectedVersion:invitation.version}),'Đã đánh dấu đã gửi thiệp.')}>Đánh dấu đã gửi</button>
   </div>
   {editing?.id===invitation.id&&events.data&&<GuestEditForm key={`${invitation.id}:${invitation.version}`} invitation={invitation} events={events.data} busy={state.busy} save={async body=>{const ok=await state.run(()=>api(`/admin/invitations/${invitation.id}`,'PUT',body),'Đã lưu thay đổi khách.');if(ok)setEditing(null);return ok;}}/>}
   {isOwner&&<><details><summary>Truy cập lời mời · <Badge value={invitation.mode}/></summary><PolicyForm key={invitation.version} policy={invitation} busy={state.busy} save={body=>state.run(()=>api(`/admin/invitations/${invitation.id}/access-policy`,'PUT',body))}/></details><PinPanel invitationId={invitation.id} pinEnabled={invitation.pin_enabled} busy={state.busy} onDone={()=>state.reload()}/><details><summary>Thao tác bảo mật và lưu trữ</summary><div className="row">{!invitation.archived?<button className="secondary" disabled={state.busy} onClick={()=>setPending({invitation,action:'archive'})}>Lưu trữ khách</button>:<button className="secondary" disabled={state.busy} onClick={()=>void state.run(()=>api(`/admin/invitations/${invitation.id}/restore`,`POST`,{expectedVersion:invitation.version}),`Đã khôi phục khách.`)}>Khôi phục khách</button>}{invitation.active&&!invitation.archived&&<button className="danger" disabled={state.busy} onClick={()=>setPending({invitation,action:'revoke'})}>Thu hồi link</button>}{!invitation.archived&&<button className="secondary" disabled={state.busy} onClick={()=>setPending({invitation,action:'rotate'})}>Tạo link mới</button>}</div></details></>}
   {!isOwner&&<div className="row"><details><summary>Lưu trữ khách</summary>{!invitation.archived?<button className="secondary" disabled={state.busy} onClick={()=>setPending({invitation,action:'archive'})}>Lưu trữ khách</button>:<button className="secondary" disabled={state.busy} onClick={()=>void state.run(()=>api(`/admin/invitations/${invitation.id}/restore`,'POST',{expectedVersion:invitation.version}),'Đã khôi phục khách.')}>Khôi phục khách</button>}</details></div>}
  </section>)}
  <div className="pagination"><button className="secondary" disabled={page===0} onClick={()=>setPage(page-1)}>← Trang trước</button><span>Trang {page+1}</span><button className="secondary" disabled={!state.data||state.data.length<50} onClick={()=>setPage(page+1)}>Trang sau →</button></div>
  {pending&&<Confirm title={pendingTitle} busy={state.busy} onClose={()=>setPending(null)} onConfirm={async()=>{if(await state.run(()=>api(`/admin/invitations/${pending.invitation.id}/${pending.action}`,'POST',{expectedVersion:pending.invitation.version}),pending.action==='archive'?'Đã lưu trữ khách.':pending.action==='rotate'?'Đã tạo link và QR mới cho lời mời. QR cũ không còn hiệu lực.':pending.action==='revoke'?'Đã thu hồi link của lời mời.':undefined)){setPending(null);setLink(null);}}}>{pendingBody}</Confirm>}
 </>;
}