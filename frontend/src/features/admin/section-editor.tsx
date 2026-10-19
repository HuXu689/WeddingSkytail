'use client';
import {useEffect,useState} from 'react';
import {api} from '@/shared/api';
import {useUnsavedChanges} from './use-unsaved-changes';
import {ContentSections,type ContentSection} from '@/features/invitation/sections';
import {toVietnamInput,fromVietnamInput} from '@/shared/time';

const kinds={INTRO:'Giới thiệu hai bạn',FAMILY:'Gia đình',CEREMONY:'Nghi lễ riêng',TIMELINE:'Mốc lịch trình',DRESS_CODE:'Trang phục'};
export function SectionEditor({busy,onDirty,save}:{busy:boolean;onDirty:(value:boolean)=>void;save:(sections:ContentSection[])=>Promise<boolean>}){
 const [rows,setRows]=useState<ContentSection[]|null>(null),[original,setOriginal]=useState(''),[error,setError]=useState('');
 const dirty=rows!==null&&JSON.stringify(rows)!==original;
 useEffect(()=>{let active=true;void api<ContentSection[]>('/admin/wedding/sections').then(items=>{if(active){setRows(items);setOriginal(JSON.stringify(items));}}).catch(()=>{if(active)setError('Không tải được cấu hình. Không thể lưu để tránh ghi đè dữ liệu.');});return()=>{active=false;};},[]);
 useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
 useUnsavedChanges(dirty,'Nội dung tùy chọn chưa lưu. Rời trang và bỏ thay đổi?');
 function update(index:number,patch:Partial<ContentSection>){setRows(old=>old!.map((row,i)=>i===index?{...row,...patch}:row));}
 function move(index:number,offset:number){setRows(old=>{const next=[...old!];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next;});}
 return <section className="card section-editor"><h2>Nội dung tùy chọn và thứ tự</h2><p>Mặc định mục mới tắt và chỉ dành cho lời mời riêng. “Công khai” sẽ xuất hiện trên thiệp chung sau khi phát hành. Không nhập dữ liệu gia đình nếu chưa được đồng ý. Nghi lễ riêng không tạo thêm sự kiện hay quyền RSVP.</p>{error&&<p role="alert" className="error">{error}</p>}
 {rows===null?<p>Đang tải cấu hình…</p>:<form onSubmit={async event=>{event.preventDefault();if(await save(rows))setOriginal(JSON.stringify(rows));}}>
 <fieldset disabled={busy}>{rows.map((row,index)=><div className="section-editor-item" key={index}>
  <h3>{index+1}. {kinds[row.kind]}</h3><label><input type="checkbox" checked={row.enabled} onChange={e=>update(index,{enabled:e.target.checked})}/>Hiển thị mục này</label>
  <label>Tiêu đề<input required maxLength={200} value={row.title} onChange={e=>update(index,{title:e.target.value})}/></label>
  <label>Nội dung{row.kind==='DRESS_CODE'?' (ghi rõ tên màu bằng chữ)':''}<textarea maxLength={2000} value={row.body} onChange={e=>update(index,{body:e.target.value})}/></label>
  <label>Quyền xem<select value={row.audience} onChange={e=>update(index,{audience:e.target.value as ContentSection['audience']})}><option value="PRIVATE">Chỉ lời mời riêng đã mở</option><option value="PUBLIC">Công khai trên thiệp chung</option></select></label>
  {row.kind==='TIMELINE'&&<label>Thời điểm (giờ Việt Nam)<input type="datetime-local" required value={row.startsAt?toVietnamInput(row.startsAt):''} onChange={e=>update(index,{startsAt:e.target.value?fromVietnamInput(e.target.value):null})}/></label>}
  {row.kind==='DRESS_CODE'&&<label>Mẫu màu minh họa<input type="color" value={row.color??'#ffffff'} onChange={e=>update(index,{color:e.target.value})}/></label>}
  <div className="row"><button type="button" className="secondary" disabled={index===0} onClick={()=>move(index,-1)}>Lên</button><button type="button" className="secondary" disabled={index===rows.length-1} onClick={()=>move(index,1)}>Xuống</button></div>
 </div>)}<label>Thêm nội dung<select value="" disabled={rows.length>=20} onChange={e=>{if(!e.target.value)return;const kind=e.target.value as ContentSection['kind'];setRows([...rows,{kind,audience:'PRIVATE',enabled:false,title:kinds[kind],body:'',startsAt:null,color:null}]);}}><option value="">Chọn loại nội dung</option>{Object.entries(kinds).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label><p>Tắt mục không xóa nội dung. Thông tin buổi tiệc và RSVP không thể tắt hoặc đổi thứ tự tại đây.</p><button disabled={!dirty}>Lưu nháp nội dung tùy chọn</button></fieldset></form>}
 {rows&&<details><summary>Xem trước nội dung tùy chọn (gồm cả mục riêng tư)</summary><ContentSections sections={rows}/></details>}
 </section>;
}