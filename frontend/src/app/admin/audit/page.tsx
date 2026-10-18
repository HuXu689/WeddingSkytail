'use client';
import {date} from '@/shared/api';
import {label} from '@/shared/labels';
import type {AuditRow} from '@/shared/admin-types';
import {useAdmin} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Empty} from '@/features/admin/ui';
export default function Audit(){
 const state=useAdmin<AuditRow[]>('/admin/audit');
 return <><Heading title="Nhật ký chăm chút ngày vui" description="100 thao tác quản trị gần nhất. Nhật ký chỉ đọc, không chứa mật khẩu hoặc token lời mời."/><Feedback {...state} retry={()=>void state.reload().catch(()=>{})}/>{!state.data&&!state.error&&<Loading/>}{state.data?.length===0&&<Empty>Chưa có thao tác được ghi nhận.</Empty>}{!!state.data?.length&&<section className="card table"><table><caption>Nhật ký thao tác gần đây</caption><thead><tr><th scope="col">Thời điểm</th><th scope="col">Thao tác</th><th scope="col">Đối tượng</th></tr></thead><tbody>{state.data.map(row=><tr key={row.id}><td>{date(row.created_at)}</td><td>{label(row.action)}</td><td className="identifier">{row.target==='1'?'Cấu hình chung / chủ tiệc':row.target}</td></tr>)}</tbody></table></section>}</>;
}