'use client';
import {useEffect,useState} from 'react';
import {buildPersonalizedPublicUrl,buildQuickInviteMessage} from '@/features/invitation/guest-greeting';

export function QuickPublicSharePanel({coupleNames='hai bạn',slug='our-wedding'}:{coupleNames?:string;slug?:string}){
  const [origin,setOrigin]=useState('');
  const [guestName,setGuestName]=useState('');
  const [salutation,setSalutation]=useState('Thân mời');
  const [copiedKind,setCopiedKind]=useState<'url'|'msg'|''>('');

  useEffect(()=>{
    if(typeof window!=='undefined')setOrigin(window.location.origin);
  },[]);

  const shareUrl=buildPersonalizedPublicUrl(origin||'http://localhost:8088',slug,guestName,salutation);
  const shareMessage=buildQuickInviteMessage({coupleNames,guestName,salutation,url:shareUrl});

  async function copyText(val:string,kind:'url'|'msg'){
    try{
      await navigator.clipboard.writeText(val);
      setCopiedKind(kind);
      window.setTimeout(()=>setCopiedKind(cur=>cur===kind?'':cur),2400);
    }catch{}
  }

  return <section className="card quick-share-card">
    <details>
      <summary>✉ Tạo nhanh link thiệp chung cá nhân hóa tên khách (gửi Zalo / Messenger)</summary>
      <div className="quick-share-body">
        <p className="field-hint">Tạo đường dẫn thiệp công khai kèm nghi thức mở phong bì mang tên người nhận (dành cho lời mời nhanh bạn bè, đồng nghiệp chung nhóm). Để khách xác nhận tham dự RSVP theo từng buổi tiệc riêng, hãy tạo lời mời riêng ở mục trên.</p>
        <div className="grid">
          <label>Lời xưng hô
            <select value={salutation} onChange={e=>setSalutation(e.target.value)}>
              <option value="Thân mời">Thân mời</option>
              <option value="Trân trọng kính mời">Trân trọng kính mời</option>
              <option value="Kính mời">Kính mời</option>
              <option value="Thương mời">Thương mời</option>
            </select>
          </label>
          <label>Tên khách / gia đình trên phong bì
            <input value={guestName} onChange={e=>setGuestName(e.target.value)} maxLength={90} placeholder="Ví dụ: Anh Tuấn & Gia đình"/>
          </label>
        </div>
        <label>Đường dẫn cá nhân hóa
          <input readOnly value={shareUrl} onFocus={e=>e.target.select()}/>
        </label>
        <label>Tin nhắn mời mẫu
          <textarea readOnly rows={2} value={shareMessage} onFocus={e=>e.target.select()}/>
        </label>
        <div className="row">
          <button type="button" onClick={()=>void copyText(shareUrl,'url')}>{copiedKind==='url'?'Đã sao chép link ✓':'Sao chép link cá nhân hóa'}</button>
          <button type="button" className="secondary" onClick={()=>void copyText(shareMessage,'msg')}>{copiedKind==='msg'?'Đã sao chép tin nhắn ✓':'Sao chép kèm lời mời'}</button>
          <a className="button secondary" href={shareUrl} target="_blank" rel="noreferrer">Mở xem thử phong bì ↗</a>
        </div>
      </div>
    </details>
  </section>;
}
