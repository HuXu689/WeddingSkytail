'use client';
import {useState} from 'react';
import {api} from '@/shared/api';
import type {AdminUser} from '@/shared/admin-types';
import {useAdmin} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Empty,Confirm} from '@/features/admin/ui';
const roleText=(role:string)=>role==='OWNER'?'Chủ tiệc':'Trợ lý nội dung';
export default function UsersPage(){
 const state=useAdmin<AdminUser[]>('/admin/users');
 const [username,setUsername]=useState(''),[displayName,setDisplayName]=useState(''),[password,setPassword]=useState(''),[role,setRole]=useState('EDITOR');
 const [reset,setReset]=useState<string|null>(null),[resetPassword,setResetPassword]=useState(''),[confirm,setConfirm]=useState<AdminUser|null>(null),[demote,setDemote]=useState<AdminUser|null>(null);
 const rows=state.data||[];
 async function create(event:React.FormEvent){
  event.preventDefault();
  if(await state.run(()=>api('/admin/users','POST',{username:username.trim(),displayName,password,role}),'Đã tạo tài khoản. Hãy gửi mật khẩu cho người đó qua kênh riêng.')){setUsername('');setDisplayName('');setPassword('');}
 }
 return <><Heading title="Quản trị người dùng" description="Chủ tiệc có toàn quyền. Trợ lý nội dung giúp sửa thiết kế, quản lý khách, RSVP, lời chúc và nhắc nhở nhưng không xem được link, mã PIN, báo cáo hay thay đổi quyền truy cập."/>
  <Feedback {...state} retry={()=>void state.reload().catch(()=>{})}/>
  <section className="card"><details open><summary>＋ Thêm tài khoản</summary>
   <form className="user-form" onSubmit={create}>
    <label>Tên đăng nhập<input value={username} onChange={event=>setUsername(event.target.value)} minLength={3} maxLength={60} required placeholder="ví dụ: linh.content"/></label>
    <label>Tên hiển thị (không bắt buộc)<input value={displayName} onChange={event=>setDisplayName(event.target.value)} maxLength={100}/></label>
    <label>Mật khẩu ban đầu<input type="password" value={password} onChange={event=>setPassword(event.target.value)} minLength={12} maxLength={100} required autoComplete="new-password"/></label>
    <label>Vai trò<select value={role} onChange={event=>setRole(event.target.value)}><option value="EDITOR">Trợ lý nội dung</option><option value="OWNER">Chủ tiệc</option></select></label>
    <p className="field-hint">Mật khẩu tối thiểu 12 ký tự. Mật khẩu chỉ được lưu dưới dạng băm và không hiển thị lại ở bất kỳ đâu.</p>
    <button disabled={state.busy||password.length<12||username.trim().length<3}>Tạo tài khoản</button>
   </form>
  </details></section>
  {!state.data&&!state.error&&<Loading/>}
  {state.data&&(rows.length===0?<Empty>Chưa có tài khoản nào.</Empty>:<section className="card"><h2>Tài khoản hiện có</h2><div className="user-list">{rows.map(row=><article className="user-item" key={row.username}>
   <div className="user-head"><div><h3>{row.display_name||row.username}</h3><p className="field-hint">{row.username} · {roleText(row.role)} · tạo {new Date(row.created_at).toLocaleDateString('vi-VN')}{row.created_by?` bởi ${row.created_by}`:''}</p></div><span className={row.enabled?'user-active':'user-disabled'}>{row.enabled?'Đang hoạt động':'Đã khóa'}</span></div>
   {reset===row.username&&<label>Mật khẩu mới<input type="password" value={resetPassword} onChange={event=>setResetPassword(event.target.value)} minLength={12} maxLength={100} autoComplete="new-password"/></label>}
   <div className="row"><button className="secondary" disabled={state.busy} onClick={()=>void state.run(()=>api(`/admin/users/${row.username}/enabled`,'PUT',{enabled:!row.enabled}),row.enabled?'Đã khóa tài khoản.':'Đã mở lại tài khoản.')}>{row.enabled?'Khóa tài khoản':'Mở lại tài khoản'}</button><button className="secondary" disabled={state.busy} onClick={()=>{if(row.role==='OWNER')setDemote(row);else void state.run(()=>api(`/admin/users/${row.username}/role`,'PUT',{role:'OWNER'}),'Đã chuyển thành chủ tiệc.');}}>{row.role==='OWNER'?'Chuyển thành trợ lý':'Chuyển thành chủ tiệc'}</button>{reset===row.username?<><button disabled={state.busy||resetPassword.length<12} onClick={async()=>{if(await state.run(()=>api(`/admin/users/${row.username}/password`,'PUT',{password:resetPassword}),'Đã đặt lại mật khẩu. Hãy gửi mật khẩu mới qua kênh riêng.')){setReset(null);setResetPassword('');}}}>Lưu mật khẩu mới</button><button className="secondary" disabled={state.busy} onClick={()=>{setReset(null);setResetPassword('');}}>Hủy</button></>:<button className="secondary" disabled={state.busy} onClick={()=>{setReset(row.username);setResetPassword('');}}>Đặt lại mật khẩu</button>}</div>
   <button className="danger" disabled={state.busy} onClick={()=>setConfirm(row)}>Xóa tài khoản</button>
  </article>)}</div></section>)}
  {demote&&<Confirm title="Chuyển chủ tiệc thành trợ lý?" busy={state.busy} onClose={()=>setDemote(null)} onConfirm={async()=>{if(await state.run(()=>api(`/admin/users/${demote.username}/role`,'PUT',{role:'EDITOR'}),'Đã chuyển thành trợ lý nội dung.'))setDemote(null);}}>Tài khoản này sẽ mất quyền xem link, mã PIN, báo cáo và thay đổi quyền truy cập. Hệ thống luôn giữ lại ít nhất một chủ tiệc đang hoạt động.</Confirm>}
  {confirm&&<Confirm title="Xóa tài khoản này?" busy={state.busy} onClose={()=>setConfirm(null)} onConfirm={async()=>{if(await state.run(()=>api(`/admin/users/${confirm.username}`,'DELETE'),'Đã xóa tài khoản.'))setConfirm(null);}}>Tài khoản sẽ bị xóa khỏi hệ thống. Nhật ký các thao tác đã thực hiện vẫn được giữ lại để đối chiếu.</Confirm>}
 </>;
}