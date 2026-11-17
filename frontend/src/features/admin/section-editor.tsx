'use client';
import {useEffect,useState} from 'react';
import {api} from '@/shared/api';
import {useUnsavedChanges} from './use-unsaved-changes';
import {ContentSections,type ContentSection,type SectionPayload,type CeremonyItem,type TimelineItem,type PaletteColor,type FamilyGroup,type LoveMilestone,type GuestTip,type WeddingSide} from '@/features/invitation/sections';
import {INVITATION_UNAVAILABLE} from '@/features/invitation/access-copy';
import {cleanMapUrlInput} from '@/features/invitation/media-fallback';
import {toVietnamInput,fromVietnamInput} from '@/shared/time';

const kinds={INTRO:'Giới thiệu hai bạn',FAMILY:'Gia đình',CEREMONY:'Nghi lễ riêng',TIMELINE:'Mốc lịch trình',DRESS_CODE:'Trang phục'};
const bodyLabel:Record<ContentSection['kind'],string>={INTRO:'Lời dẫn ngắn',FAMILY:'Lời mở đầu',CEREMONY:'Lời nhắn chung (tùy chọn)',TIMELINE:'Ghi chú chung (tùy chọn)',DRESS_CODE:'Hướng dẫn trang phục'};
const hexPattern=/^#[0-9a-fA-F]{6}$/;

const FALLBACK_PORTRAIT_OPTIONS=[
 {label:'Ảnh chân dung mẫu — Chú rể',url:'/fallback/groom-portrait.jpg'},
 {label:'Ảnh chân dung mẫu — Cô dâu',url:'/fallback/bride-portrait.jpg'},
 {label:'Ảnh kỷ niệm mẫu — Hoàng hôn',url:'/fallback/love-story-1.jpg'},
 {label:'Ảnh kỷ niệm mẫu — Nhẫn cưới',url:'/fallback/love-story-2.jpg'},
];

/**
 * Payload rỗng theo loại. Hàng cũ (không có payload) được nâng cấp trong bộ nhớ khi mở editor —
 * DB chỉ đổi khi người dùng bấm lưu, nên mở trang không tự ghi dữ liệu.
 */
function defaultPayload(kind:ContentSection['kind'],section?:Partial<ContentSection>):SectionPayload{
  switch(kind){
    case 'INTRO': return {people:[],milestones:[]};
    case 'FAMILY': return {groups:[]};
    case 'CEREMONY': return {items:[]};
    case 'TIMELINE': return {timeline:[]};
    case 'DRESS_CODE': return {palette:section?.color?[{name:'',color:section.color}]:[],avoid:'',tips:[]};
    default: return {};
  }
}
/**
 * Mốc "gốc" của hàng cũ: chỉ có ngày giờ lấy từ `starts_at`, chưa có tên và chưa có nội dung khác.
 * Hiển thị trong editor để người dùng thấy dữ liệu cũ, nhưng KHÔNG được gửi thành mốc chi tiết khi
 * chưa đặt tên: server bắt mỗi mốc phải có tên, nên gửi đi sẽ làm hỏng mọi lần lưu của cả trang.
 */
function isLegacyMilestone(section:ContentSection,item:TimelineItem):boolean{
  return Boolean(section.startsAt)&&item.at===section.startsAt&&!item.title.trim()&&!(item.note??'').trim()&&!(item.venue??'').trim()&&!item.tentative&&item.audience!=='PRIVATE';
}
/** Hàng cũ (payload null hoặc `timeline: []`) vẫn hiện một mốc gốc để không mất dấu ngày giờ cũ. */
function timelineForEditor(section:ContentSection):TimelineItem[]{
  const items=section.payload?.timeline??[];
  if(items.length||!section.startsAt) return items;
  // Mốc gốc hàng cũ giữ PUBLIC có chủ đích: server vẫn trả starts_at của hàng legacy trên bản
  // public, và isLegacyMilestone dựa vào audience!=='PRIVATE'; đổi default ở đây sẽ lệch
  // preview/server và phá luồng lưu hàng cũ (xem RD09).
  return [{at:section.startsAt,title:'',note:'',venue:'',audience:'PUBLIC',tentative:false}];
}
const upgrade=(section:ContentSection):ContentSection=>{
  const payload=section.payload??defaultPayload(section.kind,section);
  return section.kind==='TIMELINE'?{...section,payload:{...payload,timeline:timelineForEditor({...section,payload})}}:{...section,payload};
};
/**
 * Bỏ mốc gốc chưa đặt tên trước khi gửi. `starts_at` cũ vẫn là nguồn hiển thị (renderer fallback)
 * nên không mất ngày giờ, và server nhận `timeline: []` thay vì một mốc thiếu tên.
 */
const forSave=(section:ContentSection):ContentSection=>section.kind==='TIMELINE'
  ?{...section,payload:{...(section.payload??{}),timeline:(section.payload?.timeline??[]).filter(item=>!isLegacyMilestone(section,item))}}
  :section;
/** Mốc riêng chỉ bị ẩn khi xem trước công khai; máy chủ vẫn là nơi lọc thật. */
function publicPayload(row:ContentSection):SectionPayload|null|undefined{
  if(row.kind!=='TIMELINE'||!row.payload?.timeline) return row.payload;
  return {...row.payload,timeline:row.payload.timeline.filter(item=>item.audience!=='PRIVATE')};
}
/** Đổi vị trí trong mảng mà không đột biến state cũ; trả nguyên mảng nếu chỉ số không hợp lệ. */
function moveItem<T>(items:T[],from:number,to:number):T[]{
  if(from===to||to<0||to>=items.length)return items;
  const next=[...items];
  const [item]=next.splice(from,1);
  next.splice(to,0,item);
  return next;
}
/**
 * Phản chiếu quy tắc rỗng của renderer (`features/invitation/sections.tsx`): mục bật nhưng không có
 * nội dung sẽ không hiển thị. Giữ cạnh editor để cảnh báo không báo nhầm, kể cả hàng cũ chỉ có
 * `startsAt` (TIMELINE) hoặc `color` (DRESS_CODE).
 */
function hasVisibleContent(section:ContentSection):boolean{
  const payload=section.payload??{};
  const body=section.body.trim();
  switch(section.kind){
    case 'INTRO': return body.length>0||(payload.people??[]).some(person=>person.name.trim().length>0);
    case 'FAMILY': return body.length>0||(payload.groups??[]).some(group=>(group.label??'').trim().length>0||(group.members??[]).some(member=>member.name.trim().length>0));
    case 'CEREMONY': return body.length>0||(payload.items??[]).some(item=>item.title.trim().length>0);
    case 'TIMELINE': return body.length>0||Boolean(section.startsAt)||(payload.timeline??[]).some(item=>Boolean(item.at)&&item.title.trim().length>0);
    case 'DRESS_CODE': return body.length>0||Boolean(section.color)||Boolean((payload.avoid??'').trim())||(payload.palette??[]).some(color=>color.name.trim().length>0&&/^#[0-9a-fA-F]{6}$/.test(color.color));
    default: return true;
  }
}
/** Kiểm tra gần trường trước khi gửi; server kiểm tra lại và là nơi quyết định cuối cùng. */
function firstProblem(sections:ContentSection[]):string|null{
  for(let index=0;index<sections.length;index++){
    const section=sections[index],label=`Mục ${index+1} (${kinds[section.kind]})`;
    if(!section.title.trim()) return `${label}: nhập tiêu đề.`;
    if(section.payload?.people?.some(person=>!person.name.trim())) return `${label}: mỗi người cần tên hiển thị.`;
    if(section.payload?.milestones?.some(ms=>!ms.dateLabel.trim()||!ms.title.trim())) return `${label}: mỗi cột mốc kỷ niệm cần mốc thời gian và tiêu đề.`;
    if(section.payload?.groups?.some(group=>group.members.some(member=>!member.name.trim()))) return `${label}: mỗi thành viên cần tên.`;
    if(section.payload?.items?.some(item=>!item.title.trim())) return `${label}: mỗi nghi lễ cần tên.`;
    if(section.payload?.timeline?.some(item=>!isLegacyMilestone(section,item)&&(!item.at||!item.title.trim()))) return `${label}: mỗi mốc cần ngày giờ và tên.`;
    if(section.kind==='TIMELINE'&&!(section.payload?.timeline??[]).some(item=>item.at&&item.title.trim())&&!section.startsAt) return `${label}: cần ít nhất một mốc có ngày giờ và tên.`;
    if(section.payload?.palette?.some(color=>!color.name.trim()||!hexPattern.test(color.color))) return `${label}: mỗi màu cần tên và mã dạng #RRGGBB.`;
    if(section.payload?.tips?.some(tip=>!tip.title.trim()||!tip.detail.trim())) return `${label}: mỗi lưu ý khách mời cần tiêu đề và nội dung.`;
    if(section.kind==='DRESS_CODE'&&section.enabled&&!section.body.trim()) return `${label}: hướng dẫn trang phục cần tên màu bằng chữ.`;
  }
  return null;
}

function buildStarterSections():ContentSection[]{
  return [
    {
      kind:'INTRO',
      audience:'PUBLIC',
      enabled:true,
      title:'Chuyện của hai đứa mình',
      body:'Giữa hàng triệu người trên thế gian, thật may mắn vì chúng mình đã tìm thấy nhau và cùng nắm tay bước vào chương đẹp nhất của cuộc đời.',
      startsAt:null,
      color:null,
      payload:{
        people:[
          {name:'Nguyễn Hoàng An',role:'Chú rể · Chàng kỹ sư ấm áp',note:'Điềm đạm, yêu nhiếp ảnh phim và thích nấu những bữa cơm chiều ấm cúng.',quote:'Bình yên lớn nhất sau mỗi ngày dài là được trở về bên em.',avatarUrl:'/fallback/groom-portrait.jpg'},
          {name:'Trần Thanh Bình',role:'Cô dâu · Nàng thiết kế mộng mơ',note:'Yêu hoa cỏ, thích nắng sớm cuối tuần và luôn giữ nụ cười dịu dàng.',quote:'Hạnh phúc là cùng nhau đi qua những điều giản dị nhất.',avatarUrl:'/fallback/bride-portrait.jpg'},
        ],
        milestones:[
          {dateLabel:'Mùa thu 2022',title:'Cơn mưa chiều trên phố Phan Đình Phùng',description:'Từ một tách trà nóng sẻ đôi dưới mái hiên nhỏ, câu chuyện của hai đứa bắt đầu thật tự nhiên.',photoUrl:'/fallback/love-story-1.jpg'},
          {dateLabel:'Tháng 06 · 2024',title:'Chuyến tàu đêm và ngàn dặm bên nhau',description:'Những hành trình khám phá miền đất mới giúp tụi mình thêm thấu hiểu và gắn bó.',photoUrl:'/fallback/hero.jpg'},
          {dateLabel:'Tháng 09 · 2026',title:'Lời cầu hôn dưới ánh hoàng hôn',description:'Khoảnh khắc chiếc nhẫn nhỏ trao tay cùng lời hứa đồng hành trọn đời.',photoUrl:'/fallback/love-story-2.jpg'},
        ],
      },
    },
    {
      kind:'FAMILY',
      audience:'PUBLIC',
      enabled:true,
      title:'Gia đình hai bên',
      body:'Nơi khởi nguồn của yêu thương và là điểm tựa vững chắc cho tổ ấm mới của hai con.',
      startsAt:null,
      color:null,
      payload:{
        groups:[
          {label:'Nhà Trai',side:'GROOM',location:'Quận Ba Đình, Hà Nội',welcomeNote:'Gia đình Nhà Trai trân trọng đón tiếp quý khách.',members:[{name:'Ông Nguyễn Văn Minh',note:'Thân phụ'},{name:'Bà Lê Thị Thu Hằng',note:'Thân mẫu'}]},
          {label:'Nhà Gái',side:'BRIDE',location:'Quận Đống Đa, Hà Nội',welcomeNote:'Gia đình Nhà Gái hân hạnh đón tiếp quý khách.',members:[{name:'Ông Trần Quốc Tuấn',note:'Thân phụ'},{name:'Bà Phạm Thị Lan',note:'Thân mẫu'}]},
        ],
      },
    },
    {
      kind:'CEREMONY',
      audience:'PRIVATE',
      enabled:true,
      title:'Nghi lễ truyền thống hai gia đình',
      body:'Kính mời đại gia đình và người thân tham dự nghi thức truyền thống ấm cúng.',
      startsAt:null,
      color:null,
      payload:{
        items:[
          {title:'Lễ Ăn Hỏi & Nạp Tài',side:'BRIDE',lead:'Nghi thức truyền thống tại tư gia Nhà Gái',time:'2026-12-24T02:00:00.000Z',venue:'Tư gia Nhà Gái',address:'Số 45 Phố Thái Hà, Quận Đống Đa, Hà Nội',directions:'Có đội bê tráp hướng dẫn gửi xe đầu ngõ 45 Thái Hà.',mapsUrl:'https://maps.google.com/?q=45+Thai+Ha+Dong+Da+Ha+Noi',dressNote:'Áo dài truyền thống hoặc trang phục lịch sự'},
          {title:'Lễ Vu Quy & Rước Dâu',side:'GROOM',lead:'Đón dâu về tư gia Nhà Trai làm lễ gia tiên',time:'2026-12-25T01:30:00.000Z',venue:'Tư gia Nhà Trai',address:'Số 18 Phan Đình Phùng, Quận Ba Đình, Hà Nội',directions:'Đoàn xe khởi hành đúng giờ lành.',mapsUrl:'https://maps.google.com/?q=18+Phan+Dinh+Phung+Ba+Dinh+Ha+Noi',dressNote:'Trang phục trang trọng'},
        ],
      },
    },
    {
      kind:'TIMELINE',
      audience:'PUBLIC',
      enabled:true,
      title:'Chương trình ngày chung đôi',
      body:'Các mốc thời gian chính để quý khách thuận tiện sắp xếp thời gian chung vui.',
      startsAt:null,
      color:null,
      payload:{
        timeline:[
          {at:'2026-12-25T03:30:00.000Z',title:'Đón khách & Chụp hình lưu niệm',note:'Khu vực Photobooth hoa tươi và tiệc trà nhẹ đón khách.',venue:'Sảnh Arabian (Tầng 2) — Forevermark',side:'JOINT',mapsUrl:'https://maps.google.com/?q=Forevermark+614+Lac+Long+Quan+Tay+Ho+Ha+Noi',audience:'PUBLIC',tentative:false},
          {at:'2026-12-25T04:15:00.000Z',title:'Cử hành Nghi thức Lễ Thành Hôn',note:'Khoảnh khắc trao nhẫn cưới và nâng ly chúc mừng hạnh phúc.',venue:'Khán phòng chính Sảnh Arabian',side:'JOINT',audience:'PUBLIC',tentative:false},
          {at:'2026-12-25T04:45:00.000Z',title:'Khai tiệc thân mật & Giao lưu âm nhạc',note:'Thưởng thức ẩm thực và chia sẻ niềm vui cùng hai gia đình.',venue:'Forevermark — 614 Lạc Long Quân',side:'JOINT',audience:'PUBLIC',tentative:false},
        ],
      },
    },
    {
      kind:'DRESS_CODE',
      audience:'PUBLIC',
      enabled:true,
      title:'Gợi ý trang phục & Lưu ý nhỏ',
      body:'Quý khách vui lòng diện trang phục lịch sự theo tông Trắng kem, Be cát sáng, Hồng đất hoặc Xanh lá Sage để hòa điệu cùng không gian buổi lễ.',
      startsAt:null,
      color:null,
      payload:{
        palette:[
          {name:'Trắng kem',color:'#f5f2eb'},
          {name:'Be cát sáng',color:'#dfd3c3'},
          {name:'Hồng đất',color:'#c89d94'},
          {name:'Xanh Sage',color:'#8fa387'},
        ],
        avoid:'Khách nữ vui lòng hạn chế váy trắng tinh dáng dài trùng váy lễ chính của Cô dâu.',
        tips:[
          {title:'Đón khách & Chụp hình',detail:'Sảnh mở đón khách từ 10:30 sáng với khu chụp ảnh kỷ niệm lấy liền.'},
          {title:'Bãi đỗ xe miễn phí',detail:'Khuôn viên trung tâm có hầm và sân đỗ ô tô, xe máy rộng rãi (cổng số 2).'},
          {title:'Thực đơn chay & Trẻ nhỏ',detail:'Gia đình có chuẩn bị mâm chay riêng và ghế trẻ em — bạn có thể chọn nhanh trong mục Xác nhận tham dự.'},
        ],
      },
    },
  ];
}

/**
 * Ba ngữ cảnh xem trước theo mục 5: thiệp chung (công khai), lời mời riêng của khách đã mở thiệp,
 * và link không hợp lệ (sai/đã thu hồi/hết hạn) — ngữ cảnh cuối không nhận nội dung nào.
 */
type PreviewContext='guest'|'public'|'invalid';
/** Nhãn + mô tả một dòng cho segmented control ngữ cảnh xem trước (R-I). */
const previewContexts:{id:PreviewContext;label:string;note:string}[]=[
 {id:'guest',label:'Khách được mời',note:'Lời mời riêng đã mở thiệp — hiển thị cả mốc chỉ dành cho khách.'},
 {id:'public',label:'Thiệp chung',note:'Bản công khai — máy chủ luôn ẩn mục và mốc riêng tư.'},
 {id:'invalid',label:'Link hỏng',note:'Link sai, đã thu hồi hoặc hết hạn — không trả về phần nội dung nào.'}
];

interface MediaOption { id:string; original_name:string }

export function SectionEditor({busy,onDirty,onChangeDraft,save}:{busy:boolean;onDirty:(value:boolean)=>void;onChangeDraft?:(sections:ContentSection[])=>void;save:(sections:ContentSection[])=>Promise<boolean>}){
  const [rows,setRows]=useState<ContentSection[]|null>(null),[original,setOriginal]=useState(''),[error,setError]=useState(''),[context,setContext]=useState<PreviewContext>('guest');
  const [mediaOptions,setMediaOptions]=useState<MediaOption[]>([]);
  const dirty=rows!==null&&JSON.stringify(rows)!==original;
  useEffect(()=>{let active=true;void api<ContentSection[]>('/admin/wedding/sections').then(items=>{
    if(!active)return;
    const upgraded=items.map(upgrade);
    setRows(upgraded);setOriginal(JSON.stringify(upgraded));
  }).catch(()=>{if(active)setError('Không tải được cấu hình. Không thể lưu để tránh ghi đè dữ liệu.');});
  void api<{id:string;original_name:string;kind:string}[]>('/admin/media').then(list=>{
    if(active)setMediaOptions(list.filter(item=>item.kind==='IMAGE').map(item=>({id:item.id,original_name:item.original_name})));
  }).catch(()=>{});
  return()=>{active=false;};},[]);
  useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
  useEffect(()=>{if(rows)onChangeDraft?.(rows);},[rows,onChangeDraft]);
  useUnsavedChanges(dirty,'Nội dung tùy chọn chưa lưu. Rời trang và bỏ thay đổi?');
  function update(index:number,patch:Partial<ContentSection>){setRows(old=>old!.map((row,i)=>i===index?{...row,...patch}:row));}
  function updatePayload(index:number,patch:SectionPayload){setRows(old=>old!.map((row,i)=>i===index?{...row,payload:{...(row.payload??{}),...patch}}:row));}
  function move(index:number,offset:number){setRows(old=>{const next=[...old!];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next;});}
  function removeSection(index:number){setRows(old=>old!.filter((_,i)=>i!==index));}
  function add(kind:ContentSection['kind']){setRows(old=>[...old!,{kind,audience:'PRIVATE',enabled:false,title:kinds[kind],body:'',startsAt:null,color:null,payload:kind==='TIMELINE'?{timeline:[{at:'',title:'',note:'',venue:'',audience:'PRIVATE',tentative:false}]}:defaultPayload(kind)}]);}
  /** Link không hợp lệ: máy chủ từ chối trước khi gửi dữ liệu nên không có phần nào để hiển thị. */
  const previewSections=context==='invalid'?[]:(rows??[]).filter(row=>context==='guest'||row.audience==='PUBLIC').map(row=>context==='guest'?row:{...row,payload:publicPayload(row)});
  return <section className="card section-editor"><h2>Nội dung tùy chọn và thứ tự</h2><p>Mặc định mục mới tắt và chỉ dành cho lời mời riêng. “Công khai” sẽ xuất hiện trên thiệp chung sau khi phát hành. Không nhập dữ liệu gia đình nếu chưa được đồng ý. Nghi lễ riêng không tạo thêm sự kiện hay quyền RSVP.</p>{error&&<p role="alert" className="error">{error}</p>}
  {rows===null?<p>Đang tải cấu hình…</p>:<form onSubmit={async event=>{event.preventDefault();const problem=firstProblem(rows);if(problem){setError(problem);return;}setError('');if(await save(rows.map(forSave)))setOriginal(JSON.stringify(rows));}}>
  <div className="editor-group"><div className="section-heading"><h3 className="editor-group-title">Nội dung &amp; thứ tự</h3>{rows.length===0&&<button type="button" className="secondary" disabled={busy} onClick={()=>setRows(buildStarterSections())}>Điền bộ mẫu 5 mục gợi ý</button>}</div>
  <fieldset disabled={busy}>{rows.map((row,index)=><details className="section-editor-item" key={`${row.kind}-${index}`} open={index===0||!hasVisibleContent(row)}>
    <summary className="section-editor-summary">
     <span>{index+1}. {kinds[row.kind]} — <strong>{row.title||'Chưa đặt tiêu đề'}</strong></span>
     <span className="row"><span className={row.enabled?'badge badge-active':'badge badge-draft'}>{row.enabled?'Đang bật':'Đang tắt'}</span><span className="badge">{row.audience==='PUBLIC'?'Công khai':'Chỉ lời mời riêng'}</span></span>
    </summary>
    <div className="section-editor-body">
     <label><input type="checkbox" checked={row.enabled} onChange={e=>update(index,{enabled:e.target.checked})}/>Hiển thị mục này</label>
     {row.enabled&&!hasVisibleContent(row)&&<p className="field-hint section-empty-warning"><span aria-hidden="true">!</span> Mục đang bật nhưng chưa có nội dung nên sẽ không hiển thị trên thiệp. Thêm nội dung hoặc tắt mục.</p>}
     <label>Tiêu đề<input required maxLength={200} value={row.title} onChange={e=>update(index,{title:e.target.value})}/></label>
     <label>{bodyLabel[row.kind]}{row.kind==='DRESS_CODE'?' (ghi rõ tên màu bằng chữ)':''}<textarea maxLength={2000} value={row.body} onChange={e=>update(index,{body:e.target.value})}/></label>
     <label>Quyền xem<select value={row.audience} onChange={e=>update(index,{audience:e.target.value as ContentSection['audience']})}><option value="PRIVATE">Chỉ lời mời riêng đã mở</option><option value="PUBLIC">Công khai trên thiệp chung</option></select></label>
     <KindFields row={row} index={index} mediaOptions={mediaOptions} updatePayload={updatePayload} updateRow={update}/>
     <div className="row">
      <button type="button" className="secondary" disabled={index===0} onClick={()=>move(index,-1)}>Lên</button>
      <button type="button" className="secondary" disabled={index===rows.length-1} onClick={()=>move(index,1)}>Xuống</button>
      <button type="button" className="danger" onClick={()=>removeSection(index)}>Xóa mục</button>
     </div>
    </div>
  </details>)}<label>Thêm nội dung<select value="" disabled={rows.length>=20} onChange={e=>{if(!e.target.value)return;add(e.target.value as ContentSection['kind']);}}><option value="">Chọn loại nội dung</option>{Object.entries(kinds).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label><p>Tắt mục không xóa nội dung. Thông tin buổi tiệc và RSVP không thể tắt hoặc đổi thứ tự tại đây.</p></fieldset></div>
  <div className="editor-group"><h3 className="editor-group-title">Quyền hiển thị</h3><p className="field-hint">Mục “Chỉ lời mời riêng” không xuất hiện trên thiệp chung; bảng dưới đọc trực tiếp từ bản đang chỉnh.</p>{rows!==null&&<PublicExposurePanel rows={rows}/>}</div>
  <div className="editor-savebar"><p className={dirty?'design-warning':'field-hint'}>{dirty?'Bạn có thay đổi chưa lưu.':'Nội dung đã đồng bộ với dữ liệu tải từ máy chủ.'}</p><div className="row"><button disabled={!dirty||busy}>{busy?'Đang xử lý…':'Lưu nháp nội dung tùy chọn'}</button></div></div></form>}
  {rows&&<div className="editor-group"><h3 className="editor-group-title">Xem trước</h3><details><summary>Xem trước theo ngữ cảnh</summary><p className="field-hint">Xem trước chỉ mô phỏng hiển thị; máy chủ quyết định quyền thật và luôn lọc mục riêng tư khỏi thiệp chung.</p><div className="preview-segmented" role="group" aria-label="Ngữ cảnh xem trước">{previewContexts.map(item=><button type="button" key={item.id} data-context={item.id} aria-pressed={context===item.id} onClick={()=>setContext(item.id)}>{item.label}</button>)}</div><p className="field-hint">{previewContexts.find(item=>item.id===context)?.note}</p>
  {context==='public'&&rows&&rows.some(row=>row.enabled&&row.audience==='PRIVATE')&&<p className="field-hint">Đang ẩn khỏi thiệp chung vì quyền riêng tư: {rows.filter(row=>row.enabled&&row.audience==='PRIVATE').map(row=>kinds[row.kind]).join(', ')}.</p>}
  {context==='invalid'?<div className="preview-denied" role="note">
    <p><strong>Khách mở link không hợp lệ sẽ không thấy phần nội dung nào.</strong> Không có mục công khai, lời mời riêng, tên khách hay lịch trình nào được gửi về máy khách.</p>
    <p>{INVITATION_UNAVAILABLE}</p>
    <p className="field-hint">Máy chủ từ chối trước khi trả dữ liệu, nên đây chỉ là câu chữ mô phỏng — không phải lớp bảo vệ. Link đã thu hồi cũng dùng chung thông báo này.</p>
  </div>:<ContentSections sections={previewSections}/>}</details></div>}
  </section>;
}

/** Tóm tắt đọc từ draft hiện có: những gì sẽ lên thiệp chung sau khi phát hành (RD02, không gọi API). */
function PublicExposurePanel({rows}:{rows:ContentSection[]}){
  const publicRows=rows.filter(row=>row.enabled&&row.audience==='PUBLIC');
  const hidden=rows.filter(row=>row.enabled&&row.audience==='PRIVATE');
  const timelineAllPrivate=publicRows.some(row=>row.kind==='TIMELINE'&&(row.payload?.timeline?.length??0)>0&&!(row.payload?.timeline??[]).some(item=>item.audience!=='PRIVATE'));
  const describe=(row:ContentSection):string=>{
    const milestones=row.kind==='TIMELINE'?(row.payload?.timeline??[]).filter(item=>item.audience!=='PRIVATE'&&item.title.trim()).map(item=>item.title.trim()):[];
    return milestones.length?`${kinds[row.kind]} (mốc công khai: ${milestones.join(', ')})`:kinds[row.kind];
  };
  return <div className="public-exposure-panel" role="note" aria-label="Nội dung sẽ xuất hiện trên thiệp chung">
    <p><strong>Sẽ xuất hiện trên thiệp chung:</strong> {publicRows.length?`${publicRows.map(describe).join('; ')}.`:'chưa có mục công khai nào.'}</p>
    {hidden.length>0&&<p className="field-hint">Chỉ xuất hiện trong lời mời riêng: {hidden.map(row=>kinds[row.kind]).join(', ')}.</p>}
    {timelineAllPrivate&&<p className="field-hint">Lưu ý: Mục lịch trình công khai chỉ có các mốc “Chỉ lời mời riêng”, nên máy chủ sẽ tự ẩn mục này trên thiệp chung.</p>}
    {publicRows.some(row=>row.kind==='CEREMONY')&&<p className="section-empty-warning"><span aria-hidden="true">!</span> Nghi lễ riêng đang bật công khai trên thiệp chung. Cân nhắc chuyển quyền xem về "Chỉ lời mời riêng" nếu không muốn khách ngoài nhìn thấy.</p>}
  </div>;
}

type FieldProps={row:ContentSection;index:number;mediaOptions:MediaOption[];updatePayload:(index:number,patch:SectionPayload)=>void;updateRow:(index:number,patch:Partial<ContentSection>)=>void};
function KindFields(props:FieldProps){
  switch(props.row.kind){
    case 'INTRO': return <IntroFields {...props}/>;
    case 'FAMILY': return <FamilyFields {...props}/>;
    case 'CEREMONY': return <CeremonyFields {...props}/>;
    case 'TIMELINE': return <TimelineFields {...props}/>;
    case 'DRESS_CODE': return <DressFields {...props}/>;
    default: return null;
  }
}

function MediaSelect({label,value,mediaOptions,onChange}:{label:string;value:string;mediaOptions:MediaOption[];onChange:(next:string)=>void}){
  return <label>{label}
    <select value={value} onChange={e=>onChange(e.target.value)}>
      <option value="">Không chọn ảnh (chỉ hiển thị chữ)</option>
      <optgroup label="Ảnh mẫu nghệ thuật có sẵn">
        {FALLBACK_PORTRAIT_OPTIONS.map(opt=><option key={opt.url} value={opt.url}>{opt.label}</option>)}
      </optgroup>
      {mediaOptions.length>0&&<optgroup label="Ảnh đã tải trong Thư viện">
        {mediaOptions.map(m=><option key={m.id} value={`/api/v1/admin/media/${m.id}/content`}>{m.original_name}</option>)}
      </optgroup>}
      {value&&!FALLBACK_PORTRAIT_OPTIONS.some(o=>o.url===value)&&!mediaOptions.some(m=>`/api/v1/admin/media/${m.id}/content`===value)&&<option value={value}>Ảnh đang lưu ({value})</option>}
    </select>
  </label>;
}

function IntroFields({row,index,mediaOptions,updatePayload}:FieldProps){
  const people=row.payload?.people??[];
  const milestones=row.payload?.milestones??[];
  const setPeople=(next:SectionPayload['people'])=>updatePayload(index,{people:next});
  const setMilestones=(next:LoveMilestone[])=>updatePayload(index,{milestones:next});
  const patch=(position:number,change:Partial<{name:string;role:string;note:string;quote:string;avatarUrl:string|null}>)=>setPeople(people.map((item,i)=>i===position?{...item,...change}:item));
  const patchMilestone=(position:number,change:Partial<LoveMilestone>)=>setMilestones(milestones.map((item,i)=>i===position?{...item,...change}:item));
  return <div className="section-payload">
    <p className="field-hint">Mỗi người một khối: tên hiển thị, vai trò, ảnh chân dung vòm, giới thiệu ngắn và câu trích dẫn yêu thích. Bên dưới có thể thêm các cột mốc kỷ niệm tình yêu.</p>
    {people.map((person,position)=><fieldset className="section-payload-item" key={position}>
      <legend>Người {position+1}</legend>
      <label>Tên hiển thị<input required maxLength={200} value={person.name} onChange={e=>patch(position,{name:e.target.value})}/></label>
      <label>Cách gọi hoặc vai trò (tùy chọn)<input maxLength={80} value={person.role??''} onChange={e=>patch(position,{role:e.target.value})}/></label>
      <MediaSelect label="Ảnh chân dung (tùy chọn)" value={person.avatarUrl??''} mediaOptions={mediaOptions} onChange={url=>patch(position,{avatarUrl:url||null})}/>
      <label>Giới thiệu ngắn (tùy chọn)<textarea maxLength={600} value={person.note??''} onChange={e=>patch(position,{note:e.target.value})}/></label>
      <label>Câu trích dẫn tâm đắc (tùy chọn)<input maxLength={300} value={person.quote??''} onChange={e=>patch(position,{quote:e.target.value})} placeholder="Ví dụ: Bình yên lớn nhất là có em bên cạnh."/></label>
      <div className="row">
        <button type="button" className="secondary" disabled={position===0} aria-label={`Đưa người ${position+1} lên`} onClick={()=>setPeople(moveItem(people,position,position-1))}>↑ Lên</button>
        <button type="button" className="secondary" disabled={position===people.length-1} aria-label={`Đưa người ${position+1} xuống`} onClick={()=>setPeople(moveItem(people,position,position+1))}>↓ Xuống</button>
        <button type="button" className="secondary" onClick={()=>setPeople(people.filter((_,i)=>i!==position))}>Xóa người này</button>
      </div>
    </fieldset>)}
    {people.length<4&&<button type="button" className="secondary" onClick={()=>setPeople([...people,{name:'',role:'',note:'',quote:'',avatarUrl:null}])}>Thêm người</button>}
    <h4>Cột mốc kỷ niệm tình yêu (tùy chọn)</h4>
    {milestones.map((ms,position)=><fieldset className="section-payload-item" key={`ms-${position}`}>
      <legend>Cột mốc {position+1}</legend>
      <label>Thời gian kỷ niệm<input required maxLength={80} value={ms.dateLabel} onChange={e=>patchMilestone(position,{dateLabel:e.target.value})} placeholder="Ví dụ: Mùa thu 2022 hoặc 14/02/2024"/></label>
      <label>Tên cột mốc<input required maxLength={200} value={ms.title} onChange={e=>patchMilestone(position,{title:e.target.value})} placeholder="Ví dụ: Lần đầu gặp gỡ"/></label>
      <label>Câu chuyện ngắn (tùy chọn)<textarea maxLength={800} value={ms.description??''} onChange={e=>patchMilestone(position,{description:e.target.value})}/></label>
      <MediaSelect label="Ảnh cột mốc (tùy chọn)" value={ms.photoUrl??''} mediaOptions={mediaOptions} onChange={url=>patchMilestone(position,{photoUrl:url||null})}/>
      <button type="button" className="secondary" onClick={()=>setMilestones(milestones.filter((_,i)=>i!==position))}>Xóa cột mốc</button>
    </fieldset>)}
    {milestones.length<12&&<button type="button" className="secondary" onClick={()=>setMilestones([...milestones,{dateLabel:'',title:'',description:'',photoUrl:null}])}>+ Thêm cột mốc kỷ niệm</button>}
  </div>;
}

function FamilyFields({row,index,updatePayload}:FieldProps){
  const groups=row.payload?.groups??[];
  const setGroups=(next:SectionPayload['groups'])=>updatePayload(index,{groups:next});
  const patchGroup=(position:number,change:Partial<FamilyGroup>)=>setGroups(groups.map((item,i)=>i===position?{...item,...change}:item));
  return <div className="section-payload">
    <p className="field-hint">Mỗi nhóm là một khối riêng: phân nhánh Nhà Trai / Nhà Gái, nhãn tự đặt, địa chỉ tư gia và thành viên kèm quan hệ nếu muốn.</p>
    {groups.map((group,position)=><fieldset className="section-payload-item" key={position}>
      <legend>Nhóm {position+1}</legend>
      <label>Phân nhánh gia đình<select value={group.side??''} onChange={e=>patchGroup(position,{side:(e.target.value||undefined) as WeddingSide|undefined})}><option value="">Không gắn nhãn nhánh</option><option value="GROOM">Nhà Trai</option><option value="BRIDE">Nhà Gái</option><option value="JOINT">Hai gia đình</option></select></label>
      <label>Nhãn nhóm (tùy chọn)<input maxLength={80} value={group.label??''} onChange={e=>patchGroup(position,{label:e.target.value})}/></label>
      <label>Khu vực / Địa chỉ tư gia (tùy chọn)<input maxLength={240} value={group.location??''} onChange={e=>patchGroup(position,{location:e.target.value})} placeholder="Ví dụ: Quận Đống Đa, Hà Nội"/></label>
      <label>Lời đón tiếp của gia đình (tùy chọn)<input maxLength={400} value={group.welcomeNote??''} onChange={e=>patchGroup(position,{welcomeNote:e.target.value})} placeholder="Ví dụ: Hân hạnh được đón tiếp quý khách"/></label>
      {group.members.map((member,memberPosition)=><div className="section-payload-row" key={memberPosition}>
        <label>Tên thành viên<input required maxLength={200} value={member.name} onChange={e=>patchGroup(position,{members:group.members.map((entry,j)=>j===memberPosition?{...entry,name:e.target.value}:entry)})}/></label>
        <label>Quan hệ hoặc ghi chú<input maxLength={200} value={member.note??''} onChange={e=>patchGroup(position,{members:group.members.map((entry,j)=>j===memberPosition?{...entry,note:e.target.value}:entry)})}/></label>
        <div className="row">
          <button type="button" className="secondary" disabled={memberPosition===0} aria-label={`Đưa thành viên ${memberPosition+1} lên`} onClick={()=>patchGroup(position,{members:moveItem(group.members,memberPosition,memberPosition-1)})}>↑</button>
          <button type="button" className="secondary" disabled={memberPosition===group.members.length-1} aria-label={`Đưa thành viên ${memberPosition+1} xuống`} onClick={()=>patchGroup(position,{members:moveItem(group.members,memberPosition,memberPosition+1)})}>↓</button>
          <button type="button" className="secondary" onClick={()=>patchGroup(position,{members:group.members.filter((_,j)=>j!==memberPosition)})}>Xóa thành viên</button>
        </div>
      </div>)}
      <div className="row">
        <button type="button" className="secondary" disabled={position===0} aria-label={`Đưa nhóm ${position+1} lên`} onClick={()=>setGroups(moveItem(groups,position,position-1))}>↑ Nhóm lên</button>
        <button type="button" className="secondary" disabled={position===groups.length-1} aria-label={`Đưa nhóm ${position+1} xuống`} onClick={()=>setGroups(moveItem(groups,position,position+1))}>↓ Nhóm xuống</button>
        <button type="button" className="secondary" disabled={group.members.length>=12} onClick={()=>patchGroup(position,{members:[...group.members,{name:'',note:''}]})}>Thêm thành viên</button>
        <button type="button" className="secondary" onClick={()=>setGroups(groups.filter((_,i)=>i!==position))}>Xóa nhóm này</button>
      </div>
    </fieldset>)}
    {groups.length<6&&<button type="button" className="secondary" onClick={()=>setGroups([...groups,{label:'',members:[{name:'',note:''}]}])}>Thêm nhóm</button>}
  </div>;
}

function CeremonyFields({row,index,updatePayload}:FieldProps){
  const items=row.payload?.items??[];
  const setItems=(next:SectionPayload['items'])=>updatePayload(index,{items:next});
  const patch=(position:number,change:Partial<CeremonyItem>)=>setItems(items.map((item,i)=>i===position?{...item,...change}:item));
  return <div className="section-payload">
    <p className="field-hint">Mỗi nghi lễ một khối: tên, phân nhánh Nhà Trai / Nhà Gái, ngày giờ, địa điểm và link bản đồ chỉ đường. Khách có thể lưu lịch điện thoại ngay trên từng nghi lễ.</p>
    {items.map((item,position)=><fieldset className="section-payload-item" key={position}>
      <legend>Nghi lễ {position+1}</legend>
      <label>Phân nhánh nghi lễ<select value={item.side??''} onChange={e=>patch(position,{side:(e.target.value||undefined) as WeddingSide|undefined})}><option value="">Không phân nhánh</option><option value="GROOM">Lễ Nhà Trai</option><option value="BRIDE">Lễ Nhà Gái</option><option value="JOINT">Lễ Chung Hai Gia Đình</option></select></label>
      <label>Tên nghi lễ<input required maxLength={200} value={item.title} onChange={e=>patch(position,{title:e.target.value})}/></label>
      <label>Lời dẫn (tùy chọn)<textarea maxLength={600} value={item.lead??''} onChange={e=>patch(position,{lead:e.target.value})}/></label>
      <label>Thời điểm (giờ Việt Nam, tùy chọn)<input type="datetime-local" value={item.time?toVietnamInput(item.time):''} onChange={e=>patch(position,{time:e.target.value?fromVietnamInput(e.target.value):null})}/></label>
      <label>Địa điểm (tùy chọn)<input maxLength={200} value={item.venue??''} onChange={e=>patch(position,{venue:e.target.value})}/></label>
      <label>Địa chỉ (tùy chọn)<input maxLength={500} value={item.address??''} onChange={e=>patch(position,{address:e.target.value})}/></label>
      <label>Liên kết bản đồ https:// (tùy chọn)<input maxLength={500} value={item.mapsUrl??''} onChange={e=>patch(position,{mapsUrl:cleanMapUrlInput(e.target.value)||null})} placeholder="https://maps.google.com/?q=..."/></label>
      <label>Ghi chú trang phục nghi lễ (tùy chọn)<input maxLength={240} value={item.dressNote??''} onChange={e=>patch(position,{dressNote:e.target.value})} placeholder="Ví dụ: Áo dài truyền thống"/></label>
      <label>Hướng dẫn di chuyển (tùy chọn)<textarea maxLength={500} value={item.directions??''} onChange={e=>patch(position,{directions:e.target.value})}/></label>
      <button type="button" className="secondary" onClick={()=>setItems(items.filter((_,i)=>i!==position))}>Xóa nghi lễ này</button>
    </fieldset>)}
    {items.length<6&&<button type="button" className="secondary" onClick={()=>setItems([...items,{title:'',lead:'',time:null,venue:'',address:'',directions:''}])}>Thêm nghi lễ</button>}
  </div>;
}

function TimelineFields({row,index,updatePayload,updateRow}:FieldProps){
  const items=row.payload?.timeline??[];
  const setItems=(next:SectionPayload['timeline'])=>updatePayload(index,{timeline:next});
  const patch=(position:number,change:Partial<TimelineItem>)=>setItems(items.map((item,i)=>i===position?{...item,...change}:item));
  /** Chỉ bỏ được ngày giờ cũ khi đã có mốc chi tiết: server luôn cần ít nhất một nguồn mốc (V23). */
  const namedMilestones=items.filter(item=>Boolean(item.at)&&item.title.trim().length>0).length;
  return <div className="section-payload">
    <p className="field-hint">Mỗi mốc cần ngày giờ và tên. Nhập theo giờ Việt Nam; thiệp hiển thị cùng múi giờ và tự nhóm theo ngày. Mốc “chỉ lời mời riêng” bị máy chủ lọc khỏi thiệp chung.</p>
    {row.startsAt&&<div className="row section-legacy-actions">
      <button type="button" className="secondary" disabled={namedMilestones===0} onClick={()=>{updateRow(index,{startsAt:null});setItems(items.filter(item=>!isLegacyMilestone(row,item)));}}>Bỏ ngày giờ cũ</button>
      <p className="field-hint">{namedMilestones>0?'Bỏ xong, thiệp chỉ dùng các mốc chi tiết bên dưới.':'Cần ít nhất một mốc chi tiết có tên trước khi bỏ ngày giờ cũ.'}</p>
    </div>}
    {items.map((item,position)=>{
      const legacy=isLegacyMilestone(row,item);
      return <fieldset className="section-payload-item" key={position}>
      <legend>Mốc {position+1}{legacy?' (ngày giờ cũ)':''}</legend>
      {legacy&&<p className="field-hint section-legacy-note">Mốc này đang lấy ngày giờ cũ của mục và chưa có tên. Đặt tên để lưu thành mốc chi tiết; để trống thì thiệp vẫn hiển thị ngày giờ cũ như trước.</p>}
      <label>Ngày giờ (giờ Việt Nam)<input type="datetime-local" required value={item.at?toVietnamInput(item.at):''} onChange={e=>patch(position,{at:e.target.value?fromVietnamInput(e.target.value):''})}/></label>
      <label>Tên mốc<input required={!legacy} maxLength={200} value={item.title} onChange={e=>patch(position,{title:e.target.value})}/></label>
      <label>Phân nhánh gia đình (tùy chọn)<select value={item.side??''} onChange={e=>patch(position,{side:(e.target.value||undefined) as WeddingSide|undefined})}><option value="">Chung / Không chọn</option><option value="GROOM">Nhà Trai</option><option value="BRIDE">Nhà Gái</option><option value="JOINT">Chung Hai Gia Đình</option></select></label>
      <label>Mô tả (tùy chọn)<textarea maxLength={600} value={item.note??''} onChange={e=>patch(position,{note:e.target.value})}/></label>
      <label>Địa điểm (tùy chọn)<input maxLength={200} value={item.venue??''} onChange={e=>patch(position,{venue:e.target.value})}/></label>
      <label>Liên kết bản đồ https:// (tùy chọn)<input maxLength={500} value={item.mapsUrl??''} onChange={e=>patch(position,{mapsUrl:cleanMapUrlInput(e.target.value)||null})} placeholder="https://maps.google.com/?q=..."/></label>
      <label>Quyền xem của mốc<select value={item.audience} onChange={e=>patch(position,{audience:e.target.value as TimelineItem['audience']})}><option value="PUBLIC">Hiện cả trên thiệp chung</option><option value="PRIVATE">Chỉ lời mời riêng</option></select></label>
      <label><input type="checkbox" checked={item.tentative??false} onChange={e=>patch(position,{tentative:e.target.checked})}/>Giờ chưa chốt (hiện nhãn “Dự kiến”)</label>
      {legacy?<p className="field-hint">Mốc cũ không có nút xóa vì ngày giờ nằm ở dữ liệu gốc của mục; đặt tên để thay bằng mốc chi tiết.</p>:<button type="button" className="secondary" onClick={()=>setItems(items.filter((_,i)=>i!==position))}>Xóa mốc này</button>}
    </fieldset>;})}
    {items.length<20&&<button type="button" className="secondary" onClick={()=>setItems([...items,{at:'',title:'',note:'',venue:'',audience:'PRIVATE',tentative:false}])}>Thêm mốc</button>}
  </div>;
}

function DressFields({row,index,updatePayload}:FieldProps){
  const palette=row.payload?.palette??[];
  const tips=row.payload?.tips??[];
  const setPalette=(next:SectionPayload['palette'])=>updatePayload(index,{palette:next});
  const setTips=(next:GuestTip[])=>updatePayload(index,{tips:next});
  const patch=(position:number,change:Partial<PaletteColor>)=>setPalette(palette.map((item,i)=>i===position?{...item,...change}:item));
  const patchTip=(position:number,change:Partial<GuestTip>)=>setTips(tips.map((item,i)=>i===position?{...item,...change}:item));
  return <div className="section-payload">
    <p className="field-hint">Mỗi màu cần tên bằng chữ đi kèm ô màu để khách đọc được ngay cả khi khó phân biệt màu. Có thể bổ sung thêm Cẩm nang lưu ý nhỏ cho khách mời.</p>
    {palette.map((color,position)=><div className="section-payload-row" key={position}>
      <label>Tên màu<input required maxLength={80} value={color.name} onChange={e=>patch(position,{name:e.target.value})}/></label>
      <label>Mã màu<input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color.color)?color.color:'#ffffff'} onChange={e=>patch(position,{color:e.target.value})}/></label>
      <button type="button" className="secondary" onClick={()=>setPalette(palette.filter((_,i)=>i!==position))}>Xóa màu</button>
    </div>)}
    {palette.length<8&&<button type="button" className="secondary" onClick={()=>setPalette([...palette,{name:'',color:'#f6f1e7'}])}>Thêm màu</button>}
    <label>Nên tránh (tùy chọn)<textarea maxLength={600} value={row.payload?.avoid??''} onChange={e=>updatePayload(index,{avoid:e.target.value})}/></label>
    <h4>Cẩm nang lưu ý cho khách mời (tùy chọn)</h4>
    {tips.map((tip,position)=><fieldset className="section-payload-item" key={`tip-${position}`}>
      <legend>Lưu ý {position+1}</legend>
      <label>Tiêu đề lưu ý<input required maxLength={120} value={tip.title} onChange={e=>patchTip(position,{title:e.target.value})} placeholder="Ví dụ: Bãi đỗ xe miễn phí / Thực đơn chay"/></label>
      <label>Chi tiết hướng dẫn<textarea required maxLength={500} value={tip.detail} onChange={e=>patchTip(position,{detail:e.target.value})}/></label>
      <button type="button" className="secondary" onClick={()=>setTips(tips.filter((_,i)=>i!==position))}>Xóa lưu ý</button>
    </fieldset>)}
    {tips.length<8&&<button type="button" className="secondary" onClick={()=>setTips([...tips,{title:'',detail:''}])}>+ Thêm lưu ý khách mời</button>}
  </div>;
}
