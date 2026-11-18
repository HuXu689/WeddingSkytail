'use client';
import {useState} from 'react';
import {api} from '@/shared/api';
import type {WishQueue,WishRow} from '@/shared/admin-types';
import {useAdmin} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Empty,Confirm} from '@/features/admin/ui';
const states=[['','Tất cả'],['PENDING','Chờ duyệt'],['APPROVED','Đã duyệt'],['REJECTED','Không hiển thị']];
const stateText=(value:string)=>value==='APPROVED'?'Đã duyệt':value==='REJECTED'?'Không hiển thị':'Chờ duyệt';
export default function WishesPage(){
 const [filter,setFilter]=useState(''),[query,setQuery]=useState(''),[drafts,setDrafts]=useState<Record<string,string>>({}),[pending,setPending]=useState<WishRow|null>(null);
 const [page,setPage]=useState(0);
 const state=useAdmin<WishQueue>(`/admin/wishes?page=${page}&state=${filter}&query=${encodeURIComponent(query.trim())}`);
 function broadcastWishSync(){try{if(typeof BroadcastChannel!=='undefined'){const ch=new BroadcastChannel('wedding-wishes-live');ch.postMessage('updated');ch.close();}}catch{}}
 async function runWishAction(task:()=>Promise<unknown>,notice:string){const ok=await state.run(task,notice);if(ok)broadcastWishSync();return ok;}
 function draft(row:WishRow){return drafts[row.id]??row.message;}
 return <><Heading title="Sổ lời chúc" description="Lời chúc của khách chỉ xuất hiện trên thiệp sau khi bạn duyệt. Bạn có thể sửa lỗi chính tả trước khi duyệt, từ chối hoặc xóa."/>
  <Feedback {...state} retry={()=>void state.reload().catch(()=>{})}/>
  {!state.data&&!state.error&&<Loading/>}
  {state.data&&<>
   <section className="card"><div className="section-heading"><div><h2>Hàng chờ duyệt</h2><p className="field-hint">Mặc định mọi lời chúc đều ở trạng thái chờ duyệt. Sửa nội dung chỉ đổi phần hiển thị, không đổi người gửi, và mọi thao tác đều được ghi vào nhật ký.</p></div></div>
    <div className="wish-counts"><span><strong>{state.data.counts.pending}</strong>chờ duyệt</span><span><strong>{state.data.counts.approved}</strong>đã duyệt</span><span><strong>{state.data.counts.rejected}</strong>không hiển thị</span></div>
    <div className="row wrap"><label>Trạng thái<select value={filter} onChange={event=>{setFilter(event.target.value);setPage(0);}}>{states.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label><label>Tìm lời chúc<input type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}} placeholder="Tên khách hoặc nội dung"/></label></div>
   </section>
   {state.data.rows.length===0?<Empty>Không có lời chúc nào trong nhóm này.</Empty>:<section className="wish-queue" aria-label="Danh sách lời chúc">{state.data.rows.map(row=><article className="wish-queue-item" key={row.id}>
    <div className="wish-queue-head"><div><h3>{row.display_name}</h3><p className="field-hint">{row.invitation_name}{row.group_name?` · ${row.group_name}`:''}{row.assigned_events?` · ${row.assigned_events}`:''}</p></div><span className={`wish-state ${row.state.toLowerCase()}`}>{stateText(row.state)}</span></div>
    <label>Nội dung hiển thị<textarea rows={3} maxLength={600} value={draft(row)} onChange={event=>setDrafts({...drafts,[row.id]:event.target.value})}/></label>
    {draft(row)!==row.message&&<p className="warning">Bạn vừa chỉnh sửa nội dung lời chúc — bấm <strong>Lưu &amp; Duyệt</strong> hoặc <strong>Lưu nội dung</strong> để áp dụng bản chỉnh sửa.</p>}
    {row.moderated_at&&<p className="field-hint">Đã xử lý lúc {new Date(row.moderated_at).toLocaleString('vi-VN')}{row.moderated_by?` bởi ${row.moderated_by}`:''}.</p>}
    <div className="row"><button className="secondary" disabled={state.busy||draft(row)===row.message} onClick={()=>void runWishAction(async()=>{await api(`/admin/wishes/${row.id}`,'PUT',{message:draft(row),expectedVersion:row.revision});setDrafts(prev=>{const next={...prev};delete next[row.id];return next;});},'Đã lưu nội dung lời chúc.')}>Lưu nội dung</button><button disabled={state.busy||(row.state==='APPROVED'&&draft(row)===row.message)} onClick={()=>void runWishAction(async()=>{let rev=row.revision;if(draft(row)!==row.message){await api(`/admin/wishes/${row.id}`,'PUT',{message:draft(row),expectedVersion:rev});rev+=1;}if(row.state!=='APPROVED'){await api(`/admin/wishes/${row.id}`,'POST',{state:'APPROVED',expectedVersion:rev});}setDrafts(prev=>{const next={...prev};delete next[row.id];return next;});},draft(row)!==row.message?'Đã lưu chỉnh sửa và duyệt lời chúc.':'Đã duyệt lời chúc. Lời chúc sẽ hiện trên thiệp.')}>{draft(row)!==row.message?'Lưu & Duyệt':'Duyệt'}</button><button className="secondary" disabled={state.busy||row.state==='REJECTED'} onClick={()=>void runWishAction(()=>api(`/admin/wishes/${row.id}`,'POST',{state:'REJECTED',expectedVersion:row.revision}),'Đã từ chối lời chúc này.')}>Không hiển thị</button><button className="secondary" disabled={state.busy||row.state!=='APPROVED'} onClick={()=>void runWishAction(()=>api(`/admin/wishes/${row.id}/pin`,'PUT',{pinned:!row.pinned,expectedVersion:row.revision}),row.pinned?'Đã bỏ ghim lời chúc.':'Đã ghim lời chúc.')}>{row.pinned?'Bỏ ghim':'Ghim lời chúc'}</button><button className="danger" disabled={state.busy} onClick={()=>setPending(row)}>Xóa</button></div>
   </article>)}</section>}
    <nav className="row" aria-label="Phân trang lời chúc"><button type="button" className="secondary" disabled={state.busy||page===0} onClick={()=>setPage(value=>value-1)}>Trang trước</button><span role="status">Trang {page+1} · {state.data.total} lời chúc</span><button type="button" className="secondary" disabled={state.busy||(page+1)*50>=state.data.total} onClick={()=>setPage(value=>value+1)}>Trang sau</button></nav>
   </>}
  {pending&&<Confirm title="Xóa lời chúc này?" busy={state.busy} onClose={()=>setPending(null)} onConfirm={async()=>{if(await runWishAction(()=>api(`/admin/wishes/${pending.id}`,'DELETE'),'Đã xóa lời chúc khỏi sổ.'))setPending(null);}}>Lời chúc sẽ bị xóa khỏi sổ. Nhật ký thao tác vẫn được giữ lại để đối chiếu.</Confirm>}
 </>;
}