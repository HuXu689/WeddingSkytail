'use client';
import {useState} from 'react';
import {api,ApiError} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
export interface Wish {id?:string;display_name:string;message:string;state?:string;created_at:string}
/** T24: guests write wishes, the owner approves them, and only approved ones are shown to everyone. */
export function WishBook({id,approved,reload}:{id:string;approved:Wish[];reload:()=>Promise<void>}){
 const [name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[mine,setMine]=useState<Wish[]|null>(null),[visible,setVisible]=useState(6),[mineError,setMineError]=useState('');
 async function loadMine(){setMineError('');try{setMine(await api<Wish[]>(`/guest/invitations/${id}/wishes`));}catch{setMineError('Không tải được lời chúc của bạn. Vui lòng thử lại.');}}
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');setNotice('');
  try{await api(`/guest/invitations/${id}/wishes`,'POST',{displayName:name,message});setMessage('');setNotice('Đã gửi lời chúc. Lời chúc sẽ xuất hiện trên thiệp sau khi chủ tiệc duyệt.');await loadMine();await reload();}
  catch(e){setError(e instanceof ApiError?e.message:'Chưa thể gửi lời chúc. Vui lòng thử lại.');}
  finally{setBusy(false);}
 }
 return <section className="wish-book reveal">
  <div className="section-intro"><p className="eyebrow">Sổ lời chúc</p><h2>Gửi lời chúc tới hai bạn</h2></div>
  <form className="wish-form" onSubmit={submit}>
   <label>Tên hiển thị (không bắt buộc)<input value={name} onChange={event=>setName(event.target.value)} maxLength={200} placeholder="Để trống sẽ dùng tên trên thiệp"/></label>
   <label>Lời chúc<textarea value={message} onChange={event=>setMessage(event.target.value)} rows={4} maxLength={600} required placeholder="Ví dụ: Chúc hai bạn trăm năm hạnh phúc!"/></label>
   <p className="field-hint">Lời chúc chỉ hiện trên thiệp sau khi chủ tiệc duyệt. Nội dung bạn viết không dùng cho mục đích nào khác.</p>
   {error&&<p role="alert" className="error">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
   <div className="row"><button disabled={busy||message.trim().length<2}>{busy?'Đang gửi…':'Gửi lời chúc'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>void loadMine()}>Xem lời chúc của bạn</button></div>
  </form>
  {mineError&&<p className="error" role="alert">{mineError}</p>}
  {mine&&<div className="wish-mine"><h3>Lời chúc bạn đã gửi</h3>{mine.length===0?<p className="field-hint">Bạn chưa gửi lời chúc nào.</p>:<ul>{mine.map((item,index)=><li key={item.id??index}><span className={`wish-state ${item.state==='APPROVED'?'approved':item.state==='REJECTED'?'rejected':'pending'}`}>{item.state==='APPROVED'?'Đã duyệt':item.state==='REJECTED'?'Không hiển thị':'Đang chờ duyệt'}</span><p>{text(item.message)}</p></li>)}</ul>}</div>}
  <div className="wish-list">{approved.length===0?<p className="field-hint">Chưa có lời chúc nào được duyệt. Bạn có thể là người đầu tiên.</p>:approved.slice(0,visible).map((wish,index)=><blockquote className="wish-item" key={`${wish.display_name}-${index}`}><p>{text(wish.message)}</p><cite>{oneLine(wish.display_name)}</cite></blockquote>)}</div>
  {visible<approved.length&&<button type="button" className="secondary" onClick={()=>setVisible(count=>count+6)}>Xem thêm lời chúc ({approved.length-visible})</button>}
 </section>;
}