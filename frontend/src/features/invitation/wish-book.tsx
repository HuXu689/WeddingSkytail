'use client';
import {useRef,useState} from 'react';
import {BookOpen,Send} from 'lucide-react';
import {api,ApiError} from '@/shared/api';
import {text} from '@/shared/text';
import {GuestDisclosure} from './guest-disclosure';
import {WishFeed} from './wish-feed';
import {SectionCornerStickers,StickerBadge} from './wedding-stickers';

export interface Wish {id?:string;display_name:string;message:string;state?:string;created_at:string}

const WISH_SUGGESTIONS=[
 'Chúc hai bạn trăm năm hạnh phúc, trọn đời bình yên bên nhau!',
 'Chúc mừng ngày chung đôi! Mong tổ ấm nhỏ luôn ngập tràn tiếng cười.',
 'Chúc cô dâu chú rể vĩnh kết đồng tâm, sớm đón thiên thần nhỏ nhé!',
 'Thật hạnh phúc khi được chứng kiến hành trình đẹp của hai bạn!',
];

const WISH_EMOTIONS=[
 {label:'Trăm năm hạnh phúc',stamp:'🥂 Chúc hai bạn trăm năm hạnh phúc!'},
 {label:'Vĩnh kết đồng tâm',stamp:'💍 Chúc đôi trẻ vĩnh kết đồng tâm!'},
 {label:'Ngập tràn tiếng cười',stamp:'🌸 Mong tổ ấm nhỏ luôn rộn rã tiếng cười!'},
] as const;

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
    window.dispatchEvent(new CustomEvent('wedding:petals'));
   }
   await loadMine();await reload();
  }
  catch(e){setError(e instanceof ApiError?e.message:'Chưa thể gửi lời chúc. Vui lòng thử lại.');}
  finally{submitting.current=false;setBusy(false);}
 }
 return <section className="wish-book reveal">
  <SectionCornerStickers compact/>
  <div className="section-intro wish-book-header">
   <div>
    <StickerBadge sticker="love-letter" label="Lưu bút chúc phúc"/>
    <p className="eyebrow">Sổ lời chúc</p>
    <h2>Gửi lời chúc tới hai bạn</h2>
    <p className="field-hint">Những lời chúc trân quý từ gia đình và bạn bè dành cho hai bạn.</p>
   </div>
  </div>
  <GuestDisclosure title="Viết lời chúc" hint="Một lời nhắn gửi tới hai bạn. Chỉ hiển thị sau khi được duyệt.">
  <form className="wish-form" onSubmit={submit}>
   <label>Tên hiển thị (không bắt buộc)<input value={name} onChange={event=>setName(event.target.value)} maxLength={200} placeholder="Để trống sẽ dùng tên trên thiệp"/></label>
   <div className="wish-suggestions" role="group" aria-label="Gợi ý lời chúc nhanh">
    <span className="field-hint">Gợi ý nhanh:</span>
    <div className="wish-suggestion-list">
     {WISH_SUGGESTIONS.map(sample=><button type="button" key={sample} className="secondary wish-suggestion-chip" disabled={busy} onClick={()=>setMessage(sample)}>{sample}</button>)}
    </div>
    <div className="wish-emotion-row">
     {WISH_EMOTIONS.map(emo=><button type="button" key={emo.label} className="secondary wish-emotion-chip" disabled={busy} onClick={()=>setMessage(cur=>{const next=cur.trim()?`${cur.trim()} ${emo.stamp}`:emo.stamp;return next.slice(0,600);})}>{emo.label}</button>)}
    </div>
   </div>
   <label><span>Lời chúc <small className="char-counter">{message.length}/600</small></span><textarea value={message} onChange={event=>setMessage(event.target.value)} rows={4} maxLength={600} required placeholder="Ví dụ: Chúc hai bạn trăm năm hạnh phúc!"/></label>
   <p className="field-hint">Lời chúc chỉ hiện trên thiệp sau khi chủ tiệc duyệt. Nội dung bạn viết không dùng cho mục đích nào khác.</p>
   {error&&<p role="alert" className="error">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
   <div className="row wish-form-actions">
    <button className="invitation-seal-cta" disabled={busy||message.trim().length<2}>
     <Send size={15} aria-hidden="true"/>
     <span>{busy?'Đang gửi…':'Gửi lời chúc'}</span>
    </button>
    <button type="button" className="secondary wish-action-btn" disabled={busy} onClick={()=>void loadMine()}>
     <BookOpen size={15} aria-hidden="true"/>
     <span>Xem lời chúc của bạn</span>
    </button>
   </div>
  </form>
  {mineError&&<p className="error" role="alert">{mineError}</p>}
  {mine&&<div className="wish-mine"><h3>Lời chúc bạn đã gửi</h3>{mine.length===0?<p className="field-hint">Bạn chưa gửi lời chúc nào.</p>:<ul>{mine.map((item,index)=><li key={item.id??index}><span className={`wish-state ${item.state==='APPROVED'?'approved':item.state==='REJECTED'?'rejected':'pending'}`}>{item.state==='APPROVED'?'Đã duyệt':item.state==='REJECTED'?'Không hiển thị':'Đang chờ duyệt'}</span><p>{text(item.message)}</p></li>)}</ul>}</div>}
  </GuestDisclosure>
  <WishFeed scope={{kind:'guest',invitationId:id}}/>
 </section>;
}
