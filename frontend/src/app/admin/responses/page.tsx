'use client';
import {useState} from 'react';
import {date} from '@/shared/api';
import type {ResponseRow} from '@/shared/admin-types';
import {useAdmin} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Empty,Badge} from '@/features/admin/ui';
export default function Responses(){
 const state=useAdmin<ResponseRow[]>('/admin/responses');const [query,setQuery]=useState(''),[status,setStatus]=useState('');
 const rows=state.data?.filter(row=>(!status||row.status===status)&&`${row.display_name} ${row.title}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
 return <><Heading title="Lời hồi đáp cho ngày vui" description="Danh sách 200 phản hồi gần nhất. Bộ lọc bên dưới chỉ áp dụng trên danh sách này, không phải toàn bộ khách mời."/><Feedback {...state} retry={()=>void state.reload().catch(()=>{})}/><div className="toolbar"><label>Tìm người nhận / buổi tiệc<input value={query} onChange={e=>setQuery(e.target.value)} type="search"/></label><label>Phản hồi<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tất cả</option><option value="ATTENDING">Sẽ tham dự</option><option value="DECLINED">Không thể tham dự</option></select></label></div>{!state.data&&!state.error&&<Loading/>}{rows?.length===0&&<Empty>Chưa có phản hồi phù hợp.</Empty>}{!!rows?.length&&<section className="card table"><table><caption>Phản hồi gần đây — {rows.length} kết quả đang hiển thị</caption><thead><tr>{['Người nhận','Buổi tiệc','Phản hồi','Số người','Lời nhắn riêng','Cập nhật lúc'].map(title=><th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={`${row.display_name}-${row.title}-${i}`}><td>{row.display_name}</td><td>{row.title}</td><td><Badge value={row.status}/></td><td>{row.total_people}</td><td className="note-cell">{row.note||'—'}</td><td>{date(row.updated_at)}</td></tr>)}</tbody></table></section>}</>;
}