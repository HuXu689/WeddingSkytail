'use client';
import {useState} from 'react';
import {login} from '@/shared/api';
export default function Login() {
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="login"><p className="eyebrow">Ngày chung đôi</p><h1>Chào chủ tiệc</h1><p>Quản lý lời mời và những khoảnh khắc đáng nhớ.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const data=new FormData(e.currentTarget);try{await login(String(data.get('username')),String(data.get('password')));window.location.replace('/admin');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><label>Tên đăng nhập<input name="username" autoComplete="username" required/></label><label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required/></label>{error&&<p role="alert" className="error">{error}</p>}<button disabled={busy}>Đăng nhập</button></form></main>;
}