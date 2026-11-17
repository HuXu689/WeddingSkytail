'use client';
import {useState} from 'react';
import {login} from '@/shared/api';
import {SectionCornerStickers,WeddingSticker} from '@/features/invitation/wedding-stickers';

export default function Login() {
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="login">
  <SectionCornerStickers compact/>
  <div className="login-emblem" aria-hidden="true">
   <WeddingSticker kind="royal-crest" size={76}/>
  </div>
  <p className="eyebrow">Ngày chung đôi</p>
  <h1>Chào chủ tiệc</h1>
  <p className="muted">Quản lý lời mời, phản hồi khách dự và những khoảnh khắc đáng nhớ.</p>
  <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const data=new FormData(e.currentTarget);try{await login(String(data.get('username')),String(data.get('password')));window.location.replace('/admin');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
   <label>Tên đăng nhập<input name="username" autoComplete="username" required/></label>
   <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required/></label>
   {error&&<p role="alert" className="error">{error}</p>}
   <button disabled={busy}>{busy?'Đang đăng nhập…':'Đăng nhập'}</button>
  </form>
  <div className="login-footer-links">
   <a className="text-link" href="/w/our-wedding">Xem thiệp cưới công khai</a>
   <span aria-hidden="true">·</span>
   <a className="text-link" href="/">Trang chủ</a>
  </div>
 </main>;
}
