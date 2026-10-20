'use client';
import {useEffect,useState} from 'react';
import {api} from '@/shared/api';
import {useUnsavedChanges} from './use-unsaved-changes';
import {ContentSections,type ContentSection,type SectionPayload,type CeremonyItem,type TimelineItem,type PaletteColor,type FamilyGroup} from '@/features/invitation/sections';
import {INVITATION_UNAVAILABLE} from '@/features/invitation/access-copy';
import {toVietnamInput,fromVietnamInput} from '@/shared/time';

const kinds={INTRO:'Giới thiệu hai bạn',FAMILY:'Gia đình',CEREMONY:'Nghi lễ riêng',TIMELINE:'Mốc lịch trình',DRESS_CODE:'Trang phục'};
const bodyLabel:Record<ContentSection['kind'],string>={INTRO:'Lời dẫn ngắn',FAMILY:'Lời mở đầu',CEREMONY:'Lời nhắn chung (tùy chọn)',TIMELINE:'Ghi chú chung (tùy chọn)',DRESS_CODE:'Hướng dẫn trang phục'};
const hexPattern=/^#[0-9a-fA-F]{6}$/;

/**
 * Payload rỗng theo loại. Hàng cũ (không có payload) được nâng cấp trong bộ nhớ khi mở editor —
 * DB chỉ đổi khi người dùng bấm lưu, nên mở trang không tự ghi dữ liệu.
 */
function defaultPayload(kind:ContentSection['kind'],section?:Partial<ContentSection>):SectionPayload{
  switch(kind){
    case 'INTRO': return {people:[]};
    case 'FAMILY': return {groups:[]};
    case 'CEREMONY': return {items:[]};
    case 'TIMELINE': return {timeline:[]};
    case 'DRESS_CODE': return {palette:section?.color?[{name:'',color:section.color}]:[],avoid:''};
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
    if(section.payload?.groups?.some(group=>group.members.some(member=>!member.name.trim()))) return `${label}: mỗi thành viên cần tên.`;
    if(section.payload?.items?.some(item=>!item.title.trim())) return `${label}: mỗi nghi lễ cần tên.`;
    if(section.payload?.timeline?.some(item=>!isLegacyMilestone(section,item)&&(!item.at||!item.title.trim()))) return `${label}: mỗi mốc cần ngày giờ và tên.`;
    if(section.kind==='TIMELINE'&&!(section.payload?.timeline??[]).some(item=>item.at&&item.title.trim())&&!section.startsAt) return `${label}: cần ít nhất một mốc có ngày giờ và tên.`;
    if(section.payload?.palette?.some(color=>!color.name.trim()||!hexPattern.test(color.color))) return `${label}: mỗi màu cần tên và mã dạng #RRGGBB.`;
    if(section.kind==='DRESS_CODE'&&section.enabled&&!section.body.trim()) return `${label}: hướng dẫn trang phục cần tên màu bằng chữ.`;
  }
  return null;
}

/**
 * Ba ngữ cảnh xem trước theo mục 5: thiệp chung (công khai), lời mời riêng của khách đã mở thiệp,
 * và link không hợp lệ (sai/đã thu hồi/hết hạn) — ngữ cảnh cuối không nhận nội dung nào.
 */
type PreviewContext='guest'|'public'|'invalid';

export function SectionEditor({busy,onDirty,save}:{busy:boolean;onDirty:(value:boolean)=>void;save:(sections:ContentSection[])=>Promise<boolean>}){
  const [rows,setRows]=useState<ContentSection[]|null>(null),[original,setOriginal]=useState(''),[error,setError]=useState(''),[context,setContext]=useState<PreviewContext>('guest');
  const dirty=rows!==null&&JSON.stringify(rows)!==original;
  useEffect(()=>{let active=true;void api<ContentSection[]>('/admin/wedding/sections').then(items=>{
    if(!active)return;
    const upgraded=items.map(upgrade);
    setRows(upgraded);setOriginal(JSON.stringify(upgraded));
  }).catch(()=>{if(active)setError('Không tải được cấu hình. Không thể lưu để tránh ghi đè dữ liệu.');});return()=>{active=false;};},[]);
  useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
  useUnsavedChanges(dirty,'Nội dung tùy chọn chưa lưu. Rời trang và bỏ thay đổi?');
  function update(index:number,patch:Partial<ContentSection>){setRows(old=>old!.map((row,i)=>i===index?{...row,...patch}:row));}
  function updatePayload(index:number,patch:SectionPayload){setRows(old=>old!.map((row,i)=>i===index?{...row,payload:{...(row.payload??{}),...patch}}:row));}
  function move(index:number,offset:number){setRows(old=>{const next=[...old!];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next;});}
  function add(kind:ContentSection['kind']){setRows(old=>[...old!,{kind,audience:'PRIVATE',enabled:false,title:kinds[kind],body:'',startsAt:null,color:null,payload:kind==='TIMELINE'?{timeline:[{at:'',title:'',note:'',venue:'',audience:'PUBLIC',tentative:false}]}:defaultPayload(kind)}]);}
  /** Link không hợp lệ: máy chủ từ chối trước khi gửi dữ liệu nên không có phần nào để hiển thị. */
  const previewSections=context==='invalid'?[]:(rows??[]).filter(row=>context==='guest'||row.audience==='PUBLIC').map(row=>context==='guest'?row:{...row,payload:publicPayload(row)});
  return <section className="card section-editor"><h2>Nội dung tùy chọn và thứ tự</h2><p>Mặc định mục mới tắt và chỉ dành cho lời mời riêng. “Công khai” sẽ xuất hiện trên thiệp chung sau khi phát hành. Không nhập dữ liệu gia đình nếu chưa được đồng ý. Nghi lễ riêng không tạo thêm sự kiện hay quyền RSVP.</p>{error&&<p role="alert" className="error">{error}</p>}
  {rows===null?<p>Đang tải cấu hình…</p>:<form onSubmit={async event=>{event.preventDefault();const problem=firstProblem(rows);if(problem){setError(problem);return;}setError('');if(await save(rows.map(forSave)))setOriginal(JSON.stringify(rows));}}>
  <fieldset disabled={busy}>{rows.map((row,index)=><div className="section-editor-item" key={index}>
    <h3>{index+1}. {kinds[row.kind]}</h3>
    <label><input type="checkbox" checked={row.enabled} onChange={e=>update(index,{enabled:e.target.checked})}/>Hiển thị mục này</label>
    {row.enabled&&!hasVisibleContent(row)&&<p className="field-hint section-empty-warning"><span aria-hidden="true">!</span> Mục đang bật nhưng chưa có nội dung nên sẽ không hiển thị trên thiệp. Thêm nội dung hoặc tắt mục.</p>}
    <label>Tiêu đề<input required maxLength={200} value={row.title} onChange={e=>update(index,{title:e.target.value})}/></label>
    <label>{bodyLabel[row.kind]}{row.kind==='DRESS_CODE'?' (ghi rõ tên màu bằng chữ)':''}<textarea maxLength={2000} value={row.body} onChange={e=>update(index,{body:e.target.value})}/></label>
    <label>Quyền xem<select value={row.audience} onChange={e=>update(index,{audience:e.target.value as ContentSection['audience']})}><option value="PRIVATE">Chỉ lời mời riêng đã mở</option><option value="PUBLIC">Công khai trên thiệp chung</option></select></label>
    <KindFields row={row} index={index} updatePayload={updatePayload} updateRow={update}/>
    <div className="row"><button type="button" className="secondary" disabled={index===0} onClick={()=>move(index,-1)}>Lên</button><button type="button" className="secondary" disabled={index===rows.length-1} onClick={()=>move(index,1)}>Xuống</button></div>
  </div>)}<label>Thêm nội dung<select value="" disabled={rows.length>=20} onChange={e=>{if(!e.target.value)return;add(e.target.value as ContentSection['kind']);}}><option value="">Chọn loại nội dung</option>{Object.entries(kinds).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label><p>Tắt mục không xóa nội dung. Thông tin buổi tiệc và RSVP không thể tắt hoặc đổi thứ tự tại đây.</p><button disabled={!dirty}>Lưu nháp nội dung tùy chọn</button></fieldset></form>}
  {rows&&<details><summary>Xem trước theo ngữ cảnh</summary><p className="field-hint">Xem trước chỉ mô phỏng hiển thị; máy chủ quyết định quyền thật và luôn lọc mục riêng tư khỏi thiệp chung.</p><label>Ngữ cảnh<select value={context} onChange={e=>setContext(e.target.value as PreviewContext)}><option value="guest">Lời mời riêng (khách đã mở thiệp)</option><option value="public">Thiệp chung (công khai)</option><option value="invalid">Link sai, đã thu hồi hoặc hết hạn</option></select></label>
  {context==='invalid'?<div className="preview-denied" role="note">
    <p><strong>Khách mở link không hợp lệ sẽ không thấy phần nội dung nào.</strong> Không có mục công khai, lời mời riêng, tên khách hay lịch trình nào được gửi về máy khách.</p>
    <p>{INVITATION_UNAVAILABLE}</p>
    <p className="field-hint">Máy chủ từ chối trước khi trả dữ liệu, nên đây chỉ là câu chữ mô phỏng — không phải lớp bảo vệ. Link đã thu hồi cũng dùng chung thông báo này.</p>
  </div>:<ContentSections sections={previewSections}/>}</details>}
  </section>;
}

type FieldProps={row:ContentSection;index:number;updatePayload:(index:number,patch:SectionPayload)=>void;updateRow:(index:number,patch:Partial<ContentSection>)=>void};
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

function IntroFields({row,index,updatePayload}:FieldProps){
  const people=row.payload?.people??[];
  const setPeople=(next:SectionPayload['people'])=>updatePayload(index,{people:next});
  const patch=(position:number,change:Partial<{name:string;role:string;note:string}>)=>setPeople(people.map((item,i)=>i===position?{...item,...change}:item));
  return <div className="section-payload">
    <p className="field-hint">Mỗi người một khối: tên hiển thị, cách gọi (tùy chọn) và một đoạn giới thiệu ngắn. Không có ảnh thì bố cục chữ vẫn đẹp; không bắt buộc nhập danh xưng.</p>
    {people.map((person,position)=><fieldset className="section-payload-item" key={position}>
      <legend>Người {position+1}</legend>
      <label>Tên hiển thị<input required maxLength={200} value={person.name} onChange={e=>patch(position,{name:e.target.value})}/></label>
      <label>Cách gọi hoặc vai trò (tùy chọn)<input maxLength={80} value={person.role??''} onChange={e=>patch(position,{role:e.target.value})}/></label>
      <label>Giới thiệu ngắn (tùy chọn)<textarea maxLength={600} value={person.note??''} onChange={e=>patch(position,{note:e.target.value})}/></label>
      <div className="row">
        <button type="button" className="secondary" disabled={position===0} aria-label={`Đưa người ${position+1} lên`} onClick={()=>setPeople(moveItem(people,position,position-1))}>↑ Lên</button>
        <button type="button" className="secondary" disabled={position===people.length-1} aria-label={`Đưa người ${position+1} xuống`} onClick={()=>setPeople(moveItem(people,position,position+1))}>↓ Xuống</button>
        <button type="button" className="secondary" onClick={()=>setPeople(people.filter((_,i)=>i!==position))}>Xóa người này</button>
      </div>
    </fieldset>)}
    {people.length<4&&<button type="button" className="secondary" onClick={()=>setPeople([...people,{name:'',role:'',note:''}])}>Thêm người</button>}
  </div>;
}

function FamilyFields({row,index,updatePayload}:FieldProps){
  const groups=row.payload?.groups??[];
  const setGroups=(next:SectionPayload['groups'])=>updatePayload(index,{groups:next});
  const patchGroup=(position:number,change:Partial<FamilyGroup>)=>setGroups(groups.map((item,i)=>i===position?{...item,...change}:item));
  return <div className="section-payload">
    <p className="field-hint">Mỗi nhóm là một khối riêng: nhãn tự đặt (ví dụ “Nhà gái”) và thành viên kèm quan hệ nếu muốn. Chỉ một nhóm cũng hợp lệ; không cần đủ cha và mẹ.</p>
    {groups.map((group,position)=><fieldset className="section-payload-item" key={position}>
      <legend>Nhóm {position+1}</legend>
      <label>Nhãn nhóm (tùy chọn)<input maxLength={80} value={group.label??''} onChange={e=>patchGroup(position,{label:e.target.value})}/></label>
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
    <p className="field-hint">Mỗi nghi lễ một khối: tên, lời dẫn và ngày giờ/địa điểm nếu có. Giờ và RSVP của từng buổi được quản lý ở mục Buổi tiệc; phần này chỉ giới thiệu thêm.</p>
    {items.map((item,position)=><fieldset className="section-payload-item" key={position}>
      <legend>Nghi lễ {position+1}</legend>
      <label>Tên nghi lễ<input required maxLength={200} value={item.title} onChange={e=>patch(position,{title:e.target.value})}/></label>
      <label>Lời dẫn (tùy chọn)<textarea maxLength={600} value={item.lead??''} onChange={e=>patch(position,{lead:e.target.value})}/></label>
      <label>Thời điểm (giờ Việt Nam, tùy chọn)<input type="datetime-local" value={item.time?toVietnamInput(item.time):''} onChange={e=>patch(position,{time:e.target.value?fromVietnamInput(e.target.value):null})}/></label>
      <label>Địa điểm (tùy chọn)<input maxLength={200} value={item.venue??''} onChange={e=>patch(position,{venue:e.target.value})}/></label>
      <label>Địa chỉ (tùy chọn)<input maxLength={500} value={item.address??''} onChange={e=>patch(position,{address:e.target.value})}/></label>
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
      <label>Mô tả (tùy chọn)<textarea maxLength={600} value={item.note??''} onChange={e=>patch(position,{note:e.target.value})}/></label>
      <label>Địa điểm (tùy chọn)<input maxLength={200} value={item.venue??''} onChange={e=>patch(position,{venue:e.target.value})}/></label>
      <label>Quyền xem của mốc<select value={item.audience} onChange={e=>patch(position,{audience:e.target.value as TimelineItem['audience']})}><option value="PUBLIC">Hiện cả trên thiệp chung</option><option value="PRIVATE">Chỉ lời mời riêng</option></select></label>
      <label><input type="checkbox" checked={item.tentative??false} onChange={e=>patch(position,{tentative:e.target.checked})}/>Giờ chưa chốt (hiện nhãn “Dự kiến”)</label>
      {legacy?<p className="field-hint">Mốc cũ không có nút xóa vì ngày giờ nằm ở dữ liệu gốc của mục; đặt tên để thay bằng mốc chi tiết.</p>:<button type="button" className="secondary" onClick={()=>setItems(items.filter((_,i)=>i!==position))}>Xóa mốc này</button>}
    </fieldset>;})}
    {items.length<20&&<button type="button" className="secondary" onClick={()=>setItems([...items,{at:'',title:'',note:'',venue:'',audience:'PUBLIC',tentative:false}])}>Thêm mốc</button>}
  </div>;
}

function DressFields({row,index,updatePayload}:FieldProps){
  const palette=row.payload?.palette??[];
  const setPalette=(next:SectionPayload['palette'])=>updatePayload(index,{palette:next});
  const patch=(position:number,change:Partial<PaletteColor>)=>setPalette(palette.map((item,i)=>i===position?{...item,...change}:item));
  return <div className="section-payload">
    <p className="field-hint">Mỗi màu cần tên bằng chữ đi kèm ô màu để khách đọc được ngay cả khi khó phân biệt màu. Không đặt quy định cấm mặc ngoài nội dung bạn nhập.</p>
    {palette.map((color,position)=><div className="section-payload-row" key={position}>
      <label>Tên màu<input required maxLength={80} value={color.name} onChange={e=>patch(position,{name:e.target.value})}/></label>
      <label>Mã màu<input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color.color)?color.color:'#ffffff'} onChange={e=>patch(position,{color:e.target.value})}/></label>
      <button type="button" className="secondary" onClick={()=>setPalette(palette.filter((_,i)=>i!==position))}>Xóa màu</button>
    </div>)}
    {palette.length<8&&<button type="button" className="secondary" onClick={()=>setPalette([...palette,{name:'',color:'#f6f1e7'}])}>Thêm màu</button>}
    <label>Nên tránh (tùy chọn)<textarea maxLength={600} value={row.payload?.avoid??''} onChange={e=>updatePayload(index,{avoid:e.target.value})}/></label>
  </div>;
}