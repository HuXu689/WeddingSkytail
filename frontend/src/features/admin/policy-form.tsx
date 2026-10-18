'use client';
import {useState} from 'react';
import type {Policy,PolicyMode} from '@/shared/admin-types';
import {fromVietnamInput,toVietnamInput} from '@/shared/time';
import {Badge} from './ui';
export function PolicyForm({policy,global=false,busy,save}:{policy:Policy;global?:boolean;busy:boolean;save:(body:unknown)=>Promise<boolean>}){
 const [mode,setMode]=useState<PolicyMode>(policy.mode),[open,setOpen]=useState(toVietnamInput(policy.open_at)),[close,setClose]=useState(toVietnamInput(policy.close_at)),[error,setError]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();setError('');try{
  if(mode==='SCHEDULED'&&!open)throw new Error('Hãy chọn thời điểm bắt đầu mở thiệp.');
  const openAt=open?fromVietnamInput(open):null,closeAt=close?fromVietnamInput(close):null;
  if(mode==='SCHEDULED'&&closeAt&&openAt&&closeAt<=openAt)throw new Error('Giờ đóng phải sau giờ mở.');
  await save({mode,openAt,closeAt,expectedVersion:policy.version});
 }catch(e){setError((e as Error).message);}}}>
  <p>Chế độ đã lưu: <Badge value={policy.mode}/></p>
  <label>Cho phép truy cập<select value={mode} onChange={e=>setMode(e.target.value as PolicyMode)}>{!global&&<option value="INHERIT">Theo chính sách chung</option>}<option value="MANUAL_OPEN">Mở thủ công</option><option value="MANUAL_CLOSED">Đóng thủ công</option><option value="SCHEDULED">Mở và đóng theo lịch</option></select></label>
  <p className="field-hint">Giờ Việt Nam (UTC+07:00), không phụ thuộc múi giờ máy. Đóng toàn bộ luôn được ưu tiên hơn mở từng lời mời.</p>
  <div className="grid"><label>Mở từ<input type="datetime-local" step="1" value={open} required={mode==='SCHEDULED'} onChange={e=>setOpen(e.target.value)}/></label><label>Đóng lúc (không bắt buộc)<input type="datetime-local" step="1" value={close} onChange={e=>setClose(e.target.value)}/></label></div>
  <p className="field-hint">Để trống giờ đóng nếu không muốn tự đóng link. Lịch đã nhập được giữ khi chuyển sang chế độ thủ công.</p>
  {error&&<p className="error" role="alert">{error}</p>}<button disabled={busy}>{busy?'Đang lưu…':'Lưu chính sách truy cập'}</button>
 </form>;
}