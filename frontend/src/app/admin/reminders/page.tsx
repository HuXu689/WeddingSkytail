'use client';
import {useEffect,useState} from 'react';
import {api,date} from '@/shared/api';
import type {ReminderRow,ReminderWorklist} from '@/shared/admin-types';
import {useAdmin} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Empty} from '@/features/admin/ui';
const filters=[['UNANSWERED','Chưa phản hồi'],['NO_OPEN','Chưa ghi nhận mở thiệp'],['OPENED_NO_RESPONSE','Đã mở nhưng chưa phản hồi']];
export default function RemindersPage(){
 const [eventId,setEventId]=useState(''),[filter,setFilter]=useState('UNANSWERED'),[copied,setCopied]=useState(''),[notes,setNotes]=useState<Record<string,string>>({});
 useEffect(()=>{
  const evt=new URLSearchParams(window.location.search).get('eventId');
  if(evt)setEventId(evt);
 },[]);
 const state=useAdmin<ReminderWorklist>(`/admin/reminders?filter=${filter}${eventId?`&eventId=${eventId}`:''}`);
 async function copy(row:ReminderRow){try{await navigator.clipboard.writeText(row.message);setCopied(row.invitation_id);}catch{setCopied('');}}
 return <><Heading title="Nhắc khách chưa phản hồi" description="Danh sách khách chưa xác nhận tham dự kèm nội dung nhắc soạn sẵn. Bạn tự gửi qua tin nhắn hoặc gọi điện — website không tự động gửi tin nào."/><Feedback error={state.error} notice={state.notice} retry={()=>void state.reload().catch(()=>{})}/>{!state.data&&!state.error&&<Loading/>}
 {state.data&&<>
  <section className="card"><div className="section-heading"><div><h2>Phạm vi nhắc</h2><p className="field-hint">“Đã nhắc” chỉ là ghi chú riêng của bạn. Nó không có nghĩa khách đã mở thiệp hay đã trả lời, và không ảnh hưởng tới dữ liệu lượt mở.</p></div></div>
   <div className="row wrap"><label>Buổi tiệc<select value={state.data.event.id} onChange={e=>{setEventId(e.target.value);setCopied('');}}>{state.data.events.map(item=><option key={item.id} value={item.id}>{item.title} · {date(item.start_at,item.timezone)}</option>)}</select></label><label>Nhóm cần nhắc<select value={filter} onChange={e=>{setFilter(e.target.value);setCopied('');}}>{filters.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label></div>
   <div className="reminder-counts"><span><strong>{state.data.counts.unanswered}</strong>chưa phản hồi</span><span><strong>{state.data.counts.no_open}</strong>chưa ghi nhận mở</span><span><strong>{state.data.counts.opened_no_response}</strong>đã mở nhưng chưa phản hồi</span><span><strong>{state.data.counts.contacted}</strong>bạn đã nhắc</span></div>
   <p className="field-hint">Hạn phản hồi của buổi này: {date(state.data.event.deadline,state.data.event.timezone)}. Danh sách chỉ tính lời mời đang hoạt động, chưa lưu trữ và chưa có phản hồi.</p>
  </section>
  {state.data.rows.length===0?<Empty>Không còn khách nào trong nhóm này. Hãy đổi nhóm cần nhắc hoặc chọn buổi tiệc khác.</Empty>:<section className="reminder-list" aria-label="Danh sách khách cần nhắc">{state.data.rows.map(row=><article className="reminder-item" key={row.invitation_id}>
   <div className="reminder-head"><div><h3>{row.display_name}</h3><p className="field-hint">{row.group_name||'Chưa xếp nhóm'} · {row.assigned_events||'Chưa gán buổi tiệc'}</p></div>{row.contacted_at?<span className="reminder-sent">Đã nhắc {new Date(row.contacted_at).toLocaleDateString('vi-VN')}</span>:<span className="reminder-pending">Chưa nhắc</span>}</div>
   <p className="reminder-meta">{row.open_count>0?`Đã ghi nhận mở thiệp ${row.open_count} lần`:'Chưa ghi nhận mở thiệp'} · {row.first_opened_at?`lần đầu ${date(row.first_opened_at)}`:'chưa ghi nhận lần nào'}</p>
   <label>Nội dung nhắc soạn sẵn<textarea readOnly rows={3} value={row.message} onFocus={event=>event.currentTarget.select()}/></label>
   <label>Ghi chú của bạn (không bắt buộc)<input value={notes[row.invitation_id]??''} onChange={event=>setNotes({...notes,[row.invitation_id]:event.target.value})} maxLength={500} placeholder="Ví dụ: đã nhắn Zalo sáng nay"/></label>
   <div className="row"><button className="secondary" onClick={()=>void copy(row)}>{copied===row.invitation_id?'Đã sao chép':'Sao chép nội dung'}</button>{row.contacted_at?<button className="secondary" disabled={state.busy} onClick={()=>void state.run(()=>api(`/admin/reminders/${row.invitation_id}/${state.data!.event.id}`,'DELETE'),'Đã bỏ ghi nhận nhắc cho khách này.')}>Bỏ ghi nhận nhắc</button>:<button disabled={state.busy} onClick={()=>void state.run(()=>api(`/admin/reminders/${row.invitation_id}/${state.data!.event.id}`,'POST',{note:notes[row.invitation_id]??''}),'Đã ghi nhận bạn đã nhắc khách này.')}>Đánh dấu đã nhắc</button>}</div>
  </article>)}</section>}
 </>}
 </>;
}