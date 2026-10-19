'use client';
import {useEffect,useState} from 'react';
import {api} from '@/shared/api';
import type {Me} from '@/shared/admin-types';
import {Heading,Feedback} from '@/features/admin/ui';
/** Available to both roles: nobody needs an owner to rotate their own password (T25). */
export default function AccountPage(){
 const [me,setMe]=useState<Me|null>(null),[current,setCurrent]=useState(''),[next,setNext]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{void api<Me>('/auth/me').then(setMe).catch(()=>setMe(null));},[]);
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');setNotice('');
  try{await api('/auth/password','PUT',{currentPassword:current,newPassword:next});setCurrent('');setNext('');setNotice('Đã đổi mật khẩu. Hãy dùng mật khẩu mới cho lần đăng nhập sau.');}
  catch(e){setError(e instanceof Error?e.message:'Chưa thể đổi mật khẩu. Vui lòng thử lại.');}
  finally{setBusy(false);}
 }
 const roleText=me?me.role==='OWNER'?'Chủ tiệc (toàn quyền)':'Trợ lý nội dung (không xem link, mã PIN, báo cáo hay quyền truy cập)':'Đang tải…';
 return <><Heading title="Tài khoản của tôi" description="Đổi mật khẩu đăng nhập của chính bạn. Mật khẩu tối thiểu 12 ký tự, cần nhập đúng mật khẩu hiện tại và không được trùng mật khẩu cũ."/>
  <Feedback error={error} notice={notice}/>
  <section className="card"><div className="section-heading"><div><h2>Vai trò của bạn</h2><p className="field-hint">{me?`${me.username} · ${roleText}`:'Không đọc được thông tin tài khoản.'}</p></div></div>
   <p className="field-hint">Trợ lý nội dung có thể sửa thiết kế, quản lý khách, phản hồi, lời chúc và nhắc nhở. Việc tạo link, đặt mã PIN, xem báo cáo và thay đổi quyền truy cập chỉ chủ tiệc làm được.</p>
  </section>
  <section className="card"><h2>Đổi mật khẩu</h2><form className="user-form" onSubmit={submit}>
   <label>Mật khẩu hiện tại<input type="password" value={current} onChange={event=>setCurrent(event.target.value)} minLength={12} maxLength={100} required autoComplete="current-password"/></label>
   <label>Mật khẩu mới<input type="password" value={next} onChange={event=>setNext(event.target.value)} minLength={12} maxLength={100} required autoComplete="new-password"/></label>
   {next.length>0&&next===current&&<p className="error" role="alert">Mật khẩu mới cần khác mật khẩu hiện tại.</p>}
   <button disabled={busy||current.length<12||next.length<12||next===current}>{busy?'Đang lưu…':'Đổi mật khẩu'}</button>
  </form></section>
 </>;
}