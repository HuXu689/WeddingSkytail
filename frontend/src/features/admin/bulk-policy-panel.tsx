'use client';
import {useState} from 'react';
import {api} from '@/shared/api';
import {label} from '@/shared/labels';
import {fromVietnamInput} from '@/shared/time';
import {Feedback} from './ui';

type Row={id:string;displayName:string;beforeState:string;afterState:string;version:number};
type Conflict={id:string;displayName:string;reason:string};
type Preview={mode:string;dryRun:boolean;selected:number;applicable:number;skipped:number;missing:string[];conflicts:Conflict[];rows:Row[];sessionsBlocked:number;willOpen:number;qrUnchanged:boolean;versions:Record<string,number>};
const MODES=['MANUAL_OPEN','MANUAL_CLOSED','SCHEDULED'] as const;

/** Bulk link policy: preview first, then apply with the versions the preview returned (FR18, docs/13 §5). */
export function BulkPolicyPanel({ids,onDone,onClear}:{ids:string[];onDone:()=>Promise<void>;onClear:()=>void;}) {
 const [mode,setMode]=useState<typeof MODES[number]>('MANUAL_CLOSED');
 const [openAt,setOpenAt]=useState(''),[closeAt,setCloseAt]=useState('');
 const [preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function run(dryRun:boolean){
  setBusy(true);setError('');setNotice('');
  try{
   const body={ids,mode,openAt:mode==='SCHEDULED'&&openAt?fromVietnamInput(openAt):null,closeAt:mode==='SCHEDULED'&&closeAt?fromVietnamInput(closeAt):null,dryRun,expectedVersions:dryRun?null:(preview?.versions??null)};
   const result=await api<Preview>('/admin/invitations/bulk-policy','POST',body);
   setPreview(result);
   if(dryRun) setNotice(`Xem trước: ${result.applicable} lời mời sẽ được áp dụng, ${result.skipped} lời mời bị bỏ qua.`);
   else {setNotice(`Đã áp dụng cho ${result.applicable} lời mời. Link và QR đã in vẫn dùng được.`);await onDone();onClear();}
  }catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }
 return <section className="card bulk-panel">
  <div className="section-heading"><div><h2>Áp dụng truy cập cho {ids.length} lời mời đã chọn</h2><p className="field-hint">Đóng hoặc mở hàng loạt không tạo link mới nên QR đã in vẫn dùng được. Hãy xem trước để biết ảnh hưởng trước khi áp dụng.</p></div><button className="secondary" onClick={onClear} disabled={busy} type="button">Bỏ chọn</button></div>
  <div className="grid">
   <label>Chế độ áp dụng<select value={mode} onChange={e=>{setMode(e.target.value as typeof MODES[number]);setPreview(null);}}>{MODES.map(value=><option key={value} value={value}>{label(value)}</option>)}</select></label>
   <label>Giờ Việt Nam — mở từ<input type="datetime-local" step="1" value={openAt} disabled={mode!=='SCHEDULED'} onChange={e=>{setOpenAt(e.target.value);setPreview(null);}}/></label>
   <label>Giờ Việt Nam — đóng lúc (không bắt buộc)<input type="datetime-local" step="1" value={closeAt} disabled={mode!=='SCHEDULED'} onChange={e=>{setCloseAt(e.target.value);setPreview(null);}}/></label>
  </div>
  <Feedback error={error} notice={notice}/>
  <div className="row"><button className="secondary" type="button" disabled={busy} onClick={()=>void run(true)}>Xem trước ảnh hưởng</button><button type="button" disabled={busy||!preview||preview.applicable===0} onClick={()=>void run(false)}>Áp dụng cho {preview?preview.applicable:ids.length} lời mời</button></div>
  {preview&&<div className="bulk-review"><p>Đã chọn {preview.selected} · áp dụng {preview.applicable} · bỏ qua {preview.skipped} · phiên đang mở sẽ bị chặn: {preview.sessionsBlocked} · sẽ được mở: {preview.willOpen}</p>{preview.conflicts.length>0&&<ul>{preview.conflicts.map(item=><li key={item.id}>{item.displayName}: {item.reason==='STALE'?'lời mời đã thay đổi, hãy xem trước lại':'link đã thu hồi nên không áp dụng được'}</li>)}</ul>}{preview.missing.length>0&&<p className="field-hint">Không tìm thấy {preview.missing.length} lời mời đã chọn.</p>}{preview.rows.length>0&&<div className="table"><table><thead><tr><th>Người nhận</th><th>Trạng thái hiện tại</th><th>Trạng thái sau khi áp dụng</th></tr></thead><tbody>{preview.rows.slice(0,50).map(row=><tr key={row.id}><td>{row.displayName}</td><td>{label(row.beforeState)}</td><td>{label(row.afterState)}</td></tr>)}</tbody></table></div>}</div>}
 </section>;
}