'use client';
import {useState} from 'react';
import {api,date} from '@/shared/api';
import {Confirm} from './ui';

type Status={enabled:boolean;securityRevision:number;updatedAt:string|null};
type Issued={pin:string|null;generated:boolean};

/**
 * PIN bảo vệ lời mời (FR19). Máy chủ chỉ trả mã một lần khi sinh hoặc đổi mã; sau đó không thể xem lại.
 * Bật/tắt PIN không thay đổi link hay QR của khách.
 */
export function PinPanel({invitationId,pinEnabled,busy,onDone}:{invitationId:string;pinEnabled:boolean;busy:boolean;onDone:()=>Promise<void>}) {
 const [status,setStatus]=useState<Status|null>(null),[loaded,setLoaded]=useState(false);
 const [issued,setIssued]=useState<Issued|null>(null),[custom,setCustom]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[working,setWorking]=useState(false),[confirmOff,setConfirmOff]=useState(false),[copied,setCopied]=useState(false);
 const disabled=busy||working;
 const enabled=status?status.enabled:pinEnabled;
 async function load(){ if(loaded) return; try{ setStatus(await api<Status>(`/admin/invitations/${invitationId}/pin`)); }catch(e){ setError((e as Error).message); } finally{ setLoaded(true); } }
 /** Sau mỗi thao tác, trạng thái luôn được đọc lại từ máy chủ thay vì tự suy đoán ở trình duyệt. */
 async function run(action:()=>Promise<void>){
  setWorking(true);setError('');setNotice('');
  try{ await action(); setLoaded(false); await load(); await onDone(); }
  catch(e){ setError((e as Error).message); }
  finally{ setWorking(false); }
 }
 return <details className="pin-details" onToggle={event=>{ if((event.target as HTMLDetailsElement).open) void load(); }}>
  <summary>Mã PIN bảo vệ lời mời · {enabled?'Đang bật':'Đang tắt'}</summary>
  <p className="field-hint">PIN là lớp bảo vệ thêm cho link đã in: khách phải nhập đúng mã mới mở được thiệp. Link và QR không đổi, và mã PIN không hiện lại lần thứ hai sau khi tạo.</p>
  {status&&<p className="pin-status">Trạng thái hiện tại: <strong>{status.enabled?'Đang bật':'Đang tắt'}</strong>{status.updatedAt?` · cập nhật ${date(status.updatedAt)}`:''}</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {notice&&<p className="field-hint">{notice}</p>}
  {issued?.pin&&<div className="pin-issued"><p className="field-hint">Mã PIN mới — chỉ hiển thị một lần. Hãy gửi cho khách bằng tin nhắn riêng, đừng in kèm thiệp.</p><div className="row"><code className="pin-issued-code">{issued.pin}</code><button className="secondary" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(issued.pin as string);setCopied(true);}catch{setError('Không thể sao chép tự động. Hãy chọn và sao chép mã thủ công.');}}}>{copied?'Đã sao chép ✓':'Sao chép mã'}</button></div></div>}
 <div className="row">
   {!enabled&&<button type="button" disabled={disabled} onClick={()=>void run(async()=>{const result=await api<Issued>(`/admin/invitations/${invitationId}/pin`,'PUT',{pin:''});setIssued(result);setCustom('');setNotice('Đã bật PIN do máy chủ tạo. Hãy lưu lại mã bên dưới trước khi đóng khung này.');})}>Bật PIN (máy chủ tạo mã)</button>}
   {enabled&&<button type="button" disabled={disabled} onClick={()=>void run(async()=>{const result=await api<Issued>(`/admin/invitations/${invitationId}/pin/reset`,'POST');setIssued(result);setNotice('Đã tạo mã PIN mới. Những phiên đã xác nhận PIN trước đó không còn hiệu lực.');})}>Tạo mã PIN mới</button>}
   {enabled&&<button className="danger" type="button" disabled={disabled} onClick={()=>setConfirmOff(true)}>Tắt PIN</button>}
  </div>
  <div className="row">
   <label>Tự đặt mã PIN (4–12 chữ số)<input inputMode="numeric" pattern="[0-9]*" maxLength={12} value={custom} onChange={e=>{setCustom(e.target.value.replace(/\D/g,'').slice(0,12));setIssued(null);}} placeholder="Ví dụ: 482915"/></label>
   <button className="secondary" type="button" disabled={disabled||custom.length<4} onClick={()=>void run(async()=>{await api(`/admin/invitations/${invitationId}/pin`,'PUT',{pin:custom});setCustom('');setIssued(null);setNotice('Đã bật PIN theo mã bạn đặt. Mã không được hiển thị lại nên hãy chắc chắn bạn nhớ mã.');})}>Lưu mã tôi đặt</button>
  </div>
  {confirmOff&&<Confirm title="Tắt mã PIN?" busy={working} onClose={()=>setConfirmOff(false)} onConfirm={async()=>{await run(async()=>{await api(`/admin/invitations/${invitationId}/pin`,'DELETE');setIssued(null);setNotice('Đã tắt PIN. Khách chỉ cần mở link như trước.');});setConfirmOff(false);}}>Khách sẽ không cần nhập PIN nữa. Link và QR hiện tại vẫn dùng được; nếu bạn nghi link đã bị lộ, hãy tạo link mới thay vì chỉ tắt PIN.</Confirm>}
 </details>;
}