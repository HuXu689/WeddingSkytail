'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {Wedding} from '@/shared/admin-types';
import {WeddingCanvas,themes,accents,type WeddingDesign} from '@/features/invitation/design';
import {WeddingMonthCalendar} from '@/features/invitation/wedding-month-calendar';
import {publicCalendar} from '@/shared/wedding-calendar';
import {albumThumbUrl} from '@/features/invitation/album-window';
import type {LayoutItem} from '@/features/invitation/layout';
import type {ContentSection} from '@/features/invitation/sections';
import {Confirm} from './ui';
import {api} from '@/shared/api';
import {useUnsavedChanges} from './use-unsaved-changes';
import {resetPresentation} from './design-defaults';
import {PreviewWindow} from './preview';

const presets=[
 {name:'Trang trọng',text:'Trân trọng kính mời quý khách đến chung vui trong ngày thành hôn của chúng tôi. Sự hiện diện của quý khách là niềm vinh hạnh của gia đình.'},
 {name:'Thân mật',text:'Ngày vui của chúng mình sẽ trọn vẹn hơn khi có bạn. Hãy đến cùng chia sẻ những khoảnh khắc thật đẹp và lưu lại kỷ niệm đáng nhớ nhé!'},
 {name:'Gia đình',text:'Gia đình trân trọng kính mời cô chú, anh chị và các bạn đến chung vui trong ngày hạnh phúc của hai con. Rất mong được đón tiếp mọi người.'}
];

function buildInitialDesign(wedding:Wedding):WeddingDesign{
 return {
  layout:wedding.layout,
  sections:wedding.sections,
  names:wedding.draft_names,
  message:wedding.draft_message,
  theme:wedding.draft_theme,
  accent:wedding.draft_accent,
  story:wedding.draft_story,
  footer:wedding.draft_footer,
  show_story:wedding.draft_show_story,
  heroUrl:wedding.heroUrl,
  heroPosition:wedding.heroPosition,
  albumUrls:wedding.albumUrls,
  musicUrl:wedding.musicUrl??null,
  music_autoplay:wedding.draft_music_autoplay??false
 };
}

export function DesignEditor({wedding,busy,otherDirty=false,isOwner=true,liveLayout,liveSections,save,publish,onDirty}:{wedding:Wedding;busy:boolean;otherDirty?:boolean;isOwner?:boolean;liveLayout?:LayoutItem[];liveSections?:ContentSection[];save:(body:unknown)=>Promise<boolean>;publish:()=>Promise<boolean>;onDirty:(dirty:boolean)=>void}){
 const initial=useMemo(()=>buildInitialDesign(wedding),[wedding]);
 const [design,setDesign]=useState<WeddingDesign>(initial),[phone,setPhone]=useState(true),[confirm,setConfirm]=useState(false);
 const [panel,setPanel]=useState<'edit'|'preview'>('edit'),[reset,setReset]=useState(false),[separate,setSeparate]=useState<Window|null>(null),[previewError,setPreviewError]=useState('');
 const closePreview=useCallback(()=>setSeparate(null),[]);
 const [musicId,setMusicId]=useState(wedding.draft_music_id??''),[countdown,setCountdown]=useState(wedding.draft_show_countdown),[audio,setAudio]=useState<{id:string;original_name:string}[]|null>(null);
 const [audioError,setAudioError]=useState('');
 const [syncedVersion,setSyncedVersion]=useState(wedding.version);

 useEffect(()=>{
  if(wedding.version!==syncedVersion){
   setDesign(buildInitialDesign(wedding));
   setMusicId(wedding.draft_music_id??'');
   setCountdown(wedding.draft_show_countdown);
   setSyncedVersion(wedding.version);
  }
 },[wedding,syncedVersion]);

 const loadAudio=useCallback(async()=>{
  setAudioError('');
  try{const rows=await api<{id:string;original_name:string;kind:string}[]>('/admin/media');setAudio(rows.filter(row=>row.kind==='AUDIO').map(row=>({id:row.id,original_name:row.original_name})));}
  catch{setAudioError('Không tải được danh sách nhạc. Lựa chọn đã lưu vẫn được giữ nguyên; hãy thử tải lại.');}
 },[]);

 const effectiveSections=liveSections??wedding.sections??[];
 const preview:WeddingDesign={
  ...design,
  layout:liveLayout??design.layout,
  sections:effectiveSections,
  musicUrl:musicId?`/api/v1/admin/media/${musicId}/audio`:null,
  show_countdown:countdown
 };
 const dirty=JSON.stringify({...design,layout:wedding.layout,sections:wedding.sections})!==JSON.stringify(initial)||musicId!==(wedding.draft_music_id??'')||countdown!==wedding.draft_show_countdown;
 useEffect(()=>{void loadAudio();},[loadAudio]);
 useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
 useUnsavedChanges(dirty,'Bạn có thay đổi chưa lưu. Rời trang và bỏ thay đổi?');
 function change<K extends keyof WeddingDesign>(key:K,value:WeddingDesign[K]){setDesign(old=>({...old,[key]:value}));}
 const calendarItems=publicCalendar(effectiveSections);

 return <><nav className="editor-mobile-tabs" aria-label="Chế độ chỉnh sửa"><button type="button" aria-pressed={panel==='edit'} onClick={()=>setPanel('edit')}>Chỉnh sửa</button><button type="button" aria-pressed={panel==='preview'} onClick={()=>setPanel('preview')}>Xem trước</button></nav><div className={`design-editor editor-panel-${panel}`}><form className="design-controls" onSubmit={async e=>{e.preventDefault();await save({names:design.names,message:design.message,theme:design.theme,accent:design.accent,story:design.story,footer:design.footer,showStory:design.show_story,musicId:musicId||null,musicAutoplay:design.music_autoplay??false,showCountdown:countdown,expectedVersion:wedding.version});}}>
  <fieldset disabled={busy}><legend className="sr-only">Cấu hình thiết kế</legend><section className="card"><h2>1. Chọn phong cách</h2><div className="theme-options">{themes.map(theme=><button type="button" className="theme-option" aria-pressed={design.theme===theme.id} key={theme.id} onClick={()=>change('theme',theme.id)}><strong>{theme.name}</strong><small>{theme.description}</small></button>)}</div><h3>Màu nhấn</h3><div className="color-options">{accents.map(accent=><button type="button" className="color-option" key={accent.id} aria-pressed={design.accent===accent.id} onClick={()=>change('accent',accent.id)}><span className="color-dot" style={{background:accent.color}}/>{accent.name}</button>)}</div></section>
  <section className="card"><h2>2. Nội dung lời mời</h2><label>Tên hai bạn<input value={design.names} onChange={e=>change('names',e.target.value)} required maxLength={200}/></label><label>Lời mời<textarea value={design.message} onChange={e=>change('message',e.target.value)} rows={6} maxLength={2000}/></label><details><summary>Gợi ý lời mời có sẵn</summary><p className="field-hint">Chọn mẫu bên dưới sẽ thay thế lời mời đang nhập.</p><div className="row">{presets.map(preset=><button type="button" className="secondary" key={preset.name} onClick={()=>change('message',preset.text)}>{preset.name}</button>)}</div></details></section>
  <section className="card"><h2>3. Câu chuyện &amp; lời cảm ơn</h2><label><input type="checkbox" checked={design.show_story} onChange={e=>change('show_story',e.target.checked)}/>Hiển thị câu chuyện</label><label>Câu chuyện của hai bạn<textarea value={design.story} onChange={e=>change('story',e.target.value)} rows={6} maxLength={4000}/></label><p className="field-hint">Tắt hiển thị không xóa nội dung. Nội dung này sẽ xuất hiện trên cả thiệp chung khi phát hành; chỉ nhập điều bạn muốn công khai.</p><label>Lời cảm ơn<textarea value={design.footer} onChange={e=>change('footer',e.target.value)} maxLength={500} rows={3}/></label></section>
  <section className="card"><h2>4. Nhạc nền và đếm ngược</h2><p className="field-hint">Bật hoặc tắt tự phát nhạc khi mở thiệp. Trình duyệt có thể chặn tự phát có âm thanh; khi đó khách bấm icon nhạc để nghe. Tải tệp MP3, M4A hoặc OGG (tối đa 20 MB) trong Thư viện ảnh rồi chọn ở đây.</p>{audioError&&<p className="error" role="alert">{audioError} <button type="button" className="secondary" onClick={()=>void loadAudio()}>Thử tải lại danh sách nhạc</button></p>}{audio===null?<p className="field-hint">{audioError?'Lựa chọn nhạc tạm khóa, không xóa nhạc đã lưu.':'Đang tải danh sách nhạc…'}</p>:<><label>Nhạc nền<select value={musicId} onChange={e=>setMusicId(e.target.value)}><option value="">Không dùng nhạc nền</option>{audio.map(item=><option key={item.id} value={item.id}>{item.original_name}</option>)}</select></label>{audio.length===0&&<p className="field-hint">Thư viện chưa có tệp nhạc nào.</p>}{musicId&&<audio className="music-preview" controls preload="none" src={`/api/v1/admin/media/${musicId}/audio`}>Trình duyệt của bạn không phát được tệp nhạc này.</audio>}</>}<label><input type="checkbox" checked={design.music_autoplay??false} onChange={e=>change('music_autoplay',e.target.checked)}/>Tự động phát nhạc khi mở thiệp</label><label><input type="checkbox" checked={countdown} onChange={e=>setCountdown(e.target.checked)}/>Hiển thị đếm ngược tới buổi tiệc gần nhất</label><p className="field-hint">Khối đếm ngược tự ẩn khi buổi tiệc đã bắt đầu. Khi phát hành, lựa chọn nhạc và đếm ngược cũng được công bố.</p></section>
  <section className="card"><h2>5. Ảnh bìa, album và quà mừng</h2>
   <div className="wedding-media-summary">
    {wedding.heroUrl?<img className="wedding-media-thumb" src={albumThumbUrl(wedding.heroUrl)} alt="Ảnh bìa hiện tại" style={{objectPosition:wedding.heroPosition||'50% 50%'}}/>:<div className="wedding-media-placeholder">Chưa có ảnh bìa</div>}
    <div>
     <p><strong>Ảnh bìa:</strong> {wedding.heroUrl?`Đã chọn (lấy nét ${wedding.heroPosition||'50% 50%'})`:'Chưa chọn'}</p>
     <p><strong>Album bản nháp:</strong> {(wedding.albumUrls??[]).length} ảnh (hỗ trợ tới 200 ảnh)</p>
     <div className="row">
      <a className="button secondary" href="/admin/media">Mở Thư viện ảnh &amp; Album</a>
      {isOwner&&<a className="button secondary" href="/admin/gifts">Cấu hình Hộp quà mừng</a>}
     </div>
    </div>
   </div>
   {(wedding.albumUrls??[]).length>0&&<div className="wedding-album-preview-strip">
    {(wedding.albumUrls??[]).slice(0,8).map((url,i)=><img key={url} src={albumThumbUrl(url)} alt={`Ảnh album ${i+1}`} loading="lazy" decoding="async"/>)}
    {(wedding.albumUrls??[]).length>8&&<span>+{(wedding.albumUrls??[]).length-8}</span>}
   </div>}
   <h2>6. Buổi tiệc và phản hồi</h2><p>Thông tin buổi tiệc và RSVP luôn hiển thị trên lời mời riêng theo quyền được máy chủ cấp; không có tùy chọn thiết kế để che các thông tin này.</p><a href="/admin/events">Quản lý buổi tiệc</a><h2>7. Khôi phục giao diện</h2><button type="button" className="secondary" disabled={busy} onClick={()=>setReset(true)}>Quay về mẫu và màu mặc định</button><p className="field-hint">Chỉ đổi mẫu và màu trong bản đang chỉnh; không xóa tên, nội dung, ảnh, nhạc, khách hoặc buổi tiệc. Chưa lưu sẽ không đổi dữ liệu máy chủ.</p>
  </section>
  <div className="editor-savebar"><p className={dirty?'design-warning':'field-hint'}>{dirty?'Bạn có thay đổi chưa lưu trong thiết kế.':otherDirty?'Hãy lưu các thay đổi ở Bố cục hoặc Nội dung chi tiết trước khi phát hành.':'Bản nháp đã đồng bộ với dữ liệu tải từ máy chủ.'}</p><div className="row"><button disabled={busy}>{busy?'Đang xử lý…':'Lưu bản nháp'}</button>{isOwner&&<button type="button" className="secondary" disabled={busy||dirty} onClick={()=>setConfirm(true)}>Phát hành bản đã lưu</button>}</div></div>
 </fieldset></form><aside className="design-preview" aria-label="Xem trước thiệp"><div className="preview-toolbar"><strong>Xem trước bản nháp</strong><button type="button" className="secondary" onClick={()=>{if(separate){setSeparate(null);return;}const popup=window.open('','wedding-draft-preview','popup,width=430,height=860');if(!popup){setPreviewError('Trình duyệt đã chặn cửa sổ xem trước. Hãy cho phép cửa sổ bật lên hoặc dùng khung xem trước bên dưới.');return;}setPreviewError('');setSeparate(popup);}}>{separate?'Đóng cửa sổ riêng':'Mở cửa sổ riêng'}</button><button className="secondary" aria-pressed={phone} onClick={()=>setPhone(true)}>Điện thoại</button><button className="secondary" aria-pressed={!phone} onClick={()=>setPhone(false)}>Khung rộng</button></div>{previewError&&<p role="alert" className="error">{previewError}</p>}<p className="field-hint">Xem trước gồm đầy đủ ảnh bìa, lịch hẹn, nội dung chi tiết và album bản nháp. Không ghi lượt mở và không tự phát nhạc.</p><div className={`preview-stage ${phone?'phone':''}`}><WeddingCanvas preview design={preview} recipient="Gia đình khách mời" salutation="Trân trọng kính mời" calendar={<WeddingMonthCalendar items={calendarItems}/>} countdownTo={countdown?new Date(Date.now()+30*86400000).toISOString():null}><section className="preview-example"><p className="eyebrow">Buổi tiệc minh họa</p><h2>Hân hạnh đón tiếp</h2><p>Ngày giờ và địa điểm thực tế lấy từ buổi được gán cho từng lời mời.</p><span className="badge">Xác nhận tham dự</span></section></WeddingCanvas></div>{separate&&<PreviewWindow popup={separate} onClose={closePreview}><p className="field-hint">Xem trước bản nháp — không ghi lượt mở hoặc gửi RSVP.</p><WeddingCanvas preview design={preview} calendar={<WeddingMonthCalendar items={calendarItems}/>} countdownTo={countdown?new Date(Date.now()+30*86400000).toISOString():null}/></PreviewWindow>}</aside></div>{reset&&<Confirm title="Khôi phục mẫu và màu mặc định?" busy={busy} onClose={()=>setReset(false)} onConfirm={()=>{setDesign(value=>resetPresentation(value));setReset(false);}}>Nội dung và tệp đã chọn được giữ nguyên. Thay đổi chỉ nằm trong bản đang chỉnh cho tới khi bạn lưu.</Confirm>}{confirm&&<Confirm title="Phát hành thiết kế này?" busy={busy} onClose={()=>setConfirm(false)} onConfirm={async()=>{if(await publish())setConfirm(false);}}>Nội dung, mẫu và màu sắc đã lưu sẽ hiển thị trên thiệp chung và lời mời riêng. Link và QR không thay đổi.</Confirm>}</>;
}
