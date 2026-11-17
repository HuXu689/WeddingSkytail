'use client';
import {useEffect,useRef,useState} from 'react';
import {api,ApiError,uploadFile} from '@/shared/api';
import type {GiftConfiguration,GiftInput,GiftRecipient,GiftSettings} from '@/shared/invitation-features';
import {Confirm} from './ui';

const content=(settings:GiftSettings)=>JSON.stringify({...settings,revision:0});
export function GiftEditor({initial}:{initial:GiftConfiguration}){
 const [saved,setSaved]=useState(initial.draft),[draft,setDraft]=useState(initial.draft),[published,setPublished]=useState(initial.published);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirmed,setConfirmed]=useState(false),[conflict,setConflict]=useState(false),[reloadPrompt,setReloadPrompt]=useState(false);
 const [broken,setBroken]=useState<Record<string,boolean>>({});
 const submitting=useRef(false);
 const dirty=content(draft)!==content(saved),changed=content(saved)!==content(published);
 const incomplete=draft.enabled&&[draft.first,...(draft.mode==='DUAL'?[draft.second]:[])].some(item=>!item.label.trim()||!item.assetId);
 useEffect(()=>{
  const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 function change(patch:Partial<GiftSettings>){setDraft(value=>({...value,...patch}));setConfirmed(false);setNotice('');}
 function recipient(slot:'first'|'second',patch:Partial<GiftRecipient>){change({[slot]:{...draft[slot],...patch}});}
 async function run(task:()=>Promise<void>){
  if(submitting.current)return;
  submitting.current=true;setBusy(true);setError('');setNotice('');
  try{await task();}catch(e){if(e instanceof ApiError&&e.status===409)setConflict(true);setError(e instanceof Error?e.message:'Không thể kết nối máy chủ. Vui lòng thử lại.');}
  finally{submitting.current=false;setBusy(false);}
 }
 async function save(){await run(async()=>{
  const {revision,...values}=draft;const input:GiftInput={...values,expectedRevision:revision};
  const result=await api<{revision:number}>('/admin/gifts','PUT',input);
  const next={...draft,revision:result.revision};setDraft(next);setSaved(next);setConfirmed(false);setNotice('Đã lưu nháp. Hộp quà đang phát hành chưa thay đổi.');
 });}
 async function publish(){await run(async()=>{
  const result=await api<{revision:number}>('/admin/gifts/publish','POST',{expectedRevision:saved.revision,expectedPublishedRevision:published.revision,confirmed:saved.enabled&&confirmed});
  setPublished({...saved,revision:result.revision});setConfirmed(false);setNotice(saved.enabled?'Đã phát hành cấu hình hộp quà.':'Đã tắt hộp quà trên bản phát hành.');
 });}
 async function upload(slot:'first'|'second',file:File){
  if(file.type!=='image/png'||file.size===0||file.size>5*1024*1024){setError('Chọn ảnh PNG tối đa 5 MB. Không dùng JPEG hoặc SVG.');return;}
  await run(async()=>{const result=await uploadFile<{id:string}>('/admin/gifts/assets',file);recipient(slot,{assetId:result.id});setNotice('Đã tải ảnh lên. Hãy lưu nháp và tự quét kiểm tra người nhận trước khi phát hành.');});
 }
 function panel(slot:'first'|'second',title:string){const item=draft[slot];return <fieldset className="card gift-recipient" disabled={busy}><legend>{title}</legend>
  <label>Nhãn người nhận<input maxLength={80} value={item.label} onChange={e=>recipient(slot,{label:e.target.value})}/></label>
  <label>Mô tả (không bắt buộc)<textarea rows={3} maxLength={240} value={item.description} onChange={e=>recipient(slot,{description:e.target.value})}/></label>
  <label>Ảnh mã QR (PNG)<input type="file" accept="image/png" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(slot,file);}}/></label>
  <p className="field-hint">PNG tối đa 5 MB, mỗi chiều 220–4096 pixel. Ảnh giữ nguyên, không cắt hoặc nén JPEG.</p>
  {item.assetId?<><img className="gift-qr-preview" src={`/api/v1/admin/gifts/assets/${encodeURIComponent(item.assetId)}`} alt={`Xem trước QR ${title.toLowerCase()}`} width={280} height={280} onLoad={()=>setBroken(previous=>({...previous,[item.assetId!]:false}))} onError={()=>setBroken(previous=>({...previous,[item.assetId!]:true}))}/>{broken[item.assetId]&&<p role="alert" className="error">Chưa tải được ảnh xem trước. Tải lại cấu hình hoặc chọn lại tệp trước khi xác nhận.</p>}<button type="button" className="secondary" onClick={()=>recipient(slot,{assetId:null})}>Gỡ ảnh khỏi bản nháp</button></>:<p className="field-hint">Chưa có ảnh QR. Không có mã minh họa nào được tự tạo.</p>}
 </fieldset>;}
 return <div className="gift-editor" aria-busy={busy}>
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
  <section className="card"><h2>Bản đang phát hành</h2><p>{published.enabled?`Đang bật · ${published.mode==='DUAL'?'Hai mã':'Một mã'} · ${published.visibility==='PUBLIC'?'Công khai':'Chỉ lời mời riêng'}`:'Hộp quà đang tắt.'}</p><p className="field-hint">Phát hành quà mừng độc lập với phát hành nội dung thiệp. Chức năng này không xác nhận giao dịch hay việc nhận tiền.</p></section>
  <form onSubmit={e=>{e.preventDefault();void save();}}>
   <fieldset className="card" disabled={busy}><legend>Cấu hình bản nháp</legend>
    <label className="check"><input type="checkbox" checked={draft.enabled} onChange={e=>change({enabled:e.target.checked})}/>Bật hộp quà</label>
    <label>Số mã QR<select value={draft.mode} onChange={e=>change({mode:e.target.value as GiftSettings['mode']})}><option value="SINGLE">Một mã chung</option><option value="DUAL">Hai mã riêng</option></select></label>
    <label>Ai được xem?<select value={draft.visibility} onChange={e=>change({visibility:e.target.value as GiftSettings['visibility']})}><option value="PRIVATE">Chỉ khách có lời mời riêng hợp lệ</option><option value="PUBLIC">Công khai trên thiệp chung</option></select></label>
    {draft.visibility==='PUBLIC'&&<p className="warning">Người xem thiệp chung có thể xem và tải mã QR sau khi bạn phát hành. Chỉ chọn khi bạn chủ động đồng ý công khai.</p>}
   </fieldset>
   <div className="gift-recipient-grid">{panel('first',draft.mode==='SINGLE'?'Người nhận chung':'Người nhận thứ nhất')}{draft.mode==='DUAL'&&panel('second','Người nhận thứ hai')}</div>
   {draft.mode==='SINGLE'&&<p className="field-hint">Cấu hình người nhận thứ hai được giữ lại khi chuyển về một mã, không xuất hiện với khách.</p>}
   {draft.enabled&&<section className="card gift-admin-preview">
    <div className="section-heading"><div><h3>Xem trước hộp quà (bản nháp)</h3><p className="field-hint">Kiểm tra nhãn người nhận, mô tả thông tin ngân hàng và ảnh QR trước khi phát hành.</p></div></div>
    <div className="gift-admin-preview-grid">
     {[draft.first,...(draft.mode==='DUAL'?[draft.second]:[])].map((item,idx)=><div className="gift-admin-preview-item" key={idx}>
      <span className="eyebrow">Hộp quà mừng</span>
      <h4>{item.label.trim()||'Chưa nhập tên người nhận'}</h4>
      {item.description.trim()?<p className="gift-description">{item.description}</p>:<p className="field-hint">Chưa có mô tả tên ngân hàng / số tài khoản</p>}
      {item.description.trim().length>0&&item.description.trim().length<=4&&<p className="warning">Mô tả hiện rất ngắn ({item.description.trim()}) — nên ghi rõ Tên ngân hàng và Chủ tài khoản để khách đối chiếu.</p>}
      {item.assetId?<img className="gift-qr-preview" src={`/api/v1/admin/gifts/assets/${encodeURIComponent(item.assetId)}`} alt={`Xem trước QR ${idx+1}`} width={200} height={200}/>:<p className="field-hint">Chưa có ảnh QR</p>}
     </div>)}
    </div>
   </section>}
   {incomplete&&<p role="status" className="warning">Bản nháp còn thiếu nhãn hoặc ảnh QR đang dùng. Bạn vẫn có thể lưu, nhưng chưa thể phát hành khi bật.</p>}
   <div className="row"><button disabled={busy||!dirty||conflict}>{busy?'Đang xử lý…':'Lưu bản nháp'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>setReloadPrompt(true)}>Tải lại cấu hình</button></div>
  </form>
  <section className="card"><h2>Kiểm tra và phát hành</h2>
   {dirty&&<p className="field-hint">Cần lưu bản nháp trước khi phát hành.</p>}
   <label className="check"><input type="checkbox" checked={confirmed} disabled={busy||dirty||!saved.enabled} onChange={e=>setConfirmed(e.target.checked)}/>Tôi đã tự quét từng mã đang dùng và kiểm tra đúng người nhận. Tôi đồng ý với phạm vi hiển thị đã chọn.</label>
   <button type="button" disabled={busy||dirty||!changed||conflict||incomplete||(saved.enabled&&(!confirmed||[saved.first,...(saved.mode==='DUAL'?[saved.second]:[])].some(item=>item.assetId&&broken[item.assetId])))} onClick={()=>void publish()}>Phát hành cấu hình quà mừng</button>
  </section>
  {reloadPrompt&&<Confirm title="Tải lại cấu hình quà mừng?" busy={busy} error={error} onClose={()=>setReloadPrompt(false)} onConfirm={()=>void run(async()=>{const value=await api<GiftConfiguration>('/admin/gifts');setDraft(value.draft);setSaved(value.draft);setPublished(value.published);setConfirmed(false);setConflict(false);setReloadPrompt(false);})}>{dirty?'Các chỉnh sửa chưa lưu sẽ được thay bằng bản trên máy chủ. Ảnh đã upload nhưng chưa dùng không tự bị xóa.':'Nạp lại bản nháp và bản phát hành mới nhất từ máy chủ.'}</Confirm>}
 </div>;
}