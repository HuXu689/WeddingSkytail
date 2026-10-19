'use client';
import {useEffect,useState} from 'react';
import {api} from '@/shared/api';
import {useUnsavedChanges} from './use-unsaved-changes';
import {WeddingCanvas,type WeddingDesign} from '@/features/invitation/design';
import {defaultLayout,type LayoutItem} from '@/features/invitation/layout';

const labels={MUSIC:'Nhạc nền',COUNTDOWN:'Đếm ngược',STORY:'Câu chuyện',CONTENT:'Nội dung tùy chọn',ALBUM:'Album',THANKS:'Lời cảm ơn'};
export function LayoutEditor({busy,onDirty,save,preview}:{busy:boolean;onDirty:(dirty:boolean)=>void;save:(layout:LayoutItem[])=>Promise<boolean>;preview:WeddingDesign}){
 const [rows,setRows]=useState<LayoutItem[]|null>(null),[original,setOriginal]=useState(''),[error,setError]=useState('');
 const dirty=rows!==null&&JSON.stringify(rows)!==original;
 useEffect(()=>{let active=true;void api<LayoutItem[]>('/admin/wedding/layout').then(value=>{if(active){setRows(value);setOriginal(JSON.stringify(value));}}).catch(()=>{if(active)setError('Không tải được bố cục. Không lưu để tránh ghi đè.');});return()=>{active=false;};},[]);
 useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
 useUnsavedChanges(dirty,'Bố cục chưa lưu. Rời trang và bỏ thay đổi?');
 function move(index:number,offset:number){setRows(old=>{const next=[...old!];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next;});}
 return <section className="card"><h2>Bố cục các phần trên thiệp</h2><p>Ảnh bìa luôn ở đầu; buổi tiệc và RSVP luôn nằm ngay sau bìa, không thể ẩn hoặc di chuyển. Các phần bên dưới chỉ hiện khi có dữ liệu và được bật. Tắt không xóa nội dung.</p>{error&&<p role="alert" className="error">{error}</p>}{rows&&<form onSubmit={async event=>{event.preventDefault();if(await save(rows))setOriginal(JSON.stringify(rows));}}><fieldset disabled={busy}><legend>Thứ tự các phần tùy chọn</legend>{rows.map((row,index)=><div className="layout-editor-row" key={row.section}><label><input type="checkbox" checked={row.enabled} onChange={e=>setRows(old=>old!.map(item=>item.section===row.section?{...item,enabled:e.target.checked}:item))}/>{index+1}. {labels[row.section]}</label><button type="button" className="secondary" disabled={index===0} onClick={()=>move(index,-1)} aria-label={`Đưa ${labels[row.section]} lên`}>↑</button><button type="button" className="secondary" disabled={index===rows.length-1} onClick={()=>move(index,1)} aria-label={`Đưa ${labels[row.section]} xuống`}>↓</button></div>)}<ol aria-label="Xem trước thứ tự">{rows.filter(row=>row.enabled).map(row=><li key={row.section}>{labels[row.section]}</li>)}</ol><div className="row"><button disabled={!dirty}>Lưu nháp bố cục</button><button type="button" className="secondary" onClick={()=>setRows(defaultLayout.map(item=>({...item})))}>Khôi phục thứ tự mặc định</button></div></fieldset></form>}{rows&&<details><summary>Xem trước bố cục đang chỉnh</summary><div className="preview-stage phone"><WeddingCanvas design={{...preview,layout:rows}} recipient="Khách minh họa"><p>Thông tin tiệc và RSVP luôn nằm tại đây trong lời mời riêng.</p></WeddingCanvas></div></details>}</section>;
}