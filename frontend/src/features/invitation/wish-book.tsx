'use client';
import {useRef,useState} from 'react';
import {api,ApiError} from '@/shared/api';
import {text} from '@/shared/text';
import {GuestDisclosure} from './guest-disclosure';
import {WishFeed} from './wish-feed';
import {SectionCornerStickers,StickerBadge} from './wedding-stickers';
export interface Wish {id?:string;display_name:string;message:string;state?:string;created_at:string}
/** T24: guests write wishes, the owner approves them, and only approved ones are shown to everyone. */
export function WishBook({id,reload}:{id:string;reload:()=>Promise<void>}){
 const submitting=useRef(false);
 const [name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[mine,setMine]=useState<Wish[]|null>(null),[mineError,setMineError]=useState('');
 async function loadMine(){setMineError('');try{setMine(await api<Wish[]>(`/guest/invitations/${id}/wishes`));}catch{setMineError('Không tải được lời chúc của bạn. Vui lòng thử lại.');}}
 async function submit(event:React.FormEvent){
  event.preventDefault();if(submitting.current)return;submitting.current=true;setBusy(true);setError('');setNotice('');
  try{
   await api(`/guest/invitations/${id}/wishes`,'POST',{displayName:name,message});
   setMessage('');
   setNotice('Đã gửi lời chúc. Lời chúc sẽ xuất hiện trên thiệp sau khi chủ tiệc duyệt.');
   if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('wedding:fireworks'));
    window.dispatchEvent(new CustomEvent('wedding:hearts'));
   }
   await loadMine();await reload();
  }
  catch(e){setError(e instanceof ApiError?e.message:'Chưa thể gửi lời chúc. Vui lòng thử lại.');}
  finally{submitting.current=false;setBusy(false);}
 }
 return <section className="wish-book reveal">
  <SectionCornerStickers compact/>
  <div className="section-intro">
   <div>
    <StickerBadge sticker="love-letter" label="Lưu bút chúc phúc"/>
    <p className="eyebrow">Sổ lời chúc</p>
    <h2>Gửi lời chúc tới hai bạn</h2>
   </div>
  </div>
  <GuestDisclosure title="Viết lời chúc" hint="Một lời nhắn gửi tới hai bạn. Chỉ hiển thị sau khi được duyệt.">
  <form className="wish-form" onSubmit={submit}>
   <label>Tên hiển thị (không bắt buộc)<input value={name} onChange={event=>setName(event.target.value)} maxLength={200} placeholder="Để trống sẽ dùng tên trên thiệp"/></label>
   <label>Lời chúc<textarea value={message} onChange={event=>setMessage(event.target.value)} rows={4} maxLength={600} required placeholder="Ví dụ: Chúc hai bạn trăm năm hạnh phúc!"/></label>
   <p className="field-hint">Lời chúc chỉ hiện trên thiệp sau khi chủ tiệc duyệt. Nội dung bạn viết không dùng cho mục đích nào khác.</p>
   {error&&<p role="alert" className="error">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
   <div className="row"><button disabled={busy||message.trim().length<2}>{busy?'Đang gửi…':'Gửi lời chúc'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>void loadMine()}>Xem lời chúc của bạn</button></div>
  </form>
  {mineError&&<p className="error" role="alert">{mineError}</p>}
  {mine&&<div className="wish-mine"><h3>Lời chúc bạn đã gửi</h3>{mine.length===0?<p className="field-hint">Bạn chưa gửi lời chúc nào.</p>:<ul>{mine.map((item,index)=><li key={item.id??index}><span className={`wish-state ${item.state==='APPROVED'?'approved':item.state==='REJECTED'?'rejected':'pending'}`}>{item.state==='APPROVED'?'Đã duyệt':item.state==='REJECTED'?'Không hiển thị':'Đang chờ duyệt'}</span><p>{text(item.message)}</p></li>)}</ul>}</div>}
  </GuestDisclosure>
  <WishFeed scope={{kind:'guest',invitationId:id}}/>
 </section>;
}
