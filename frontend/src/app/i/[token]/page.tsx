'use client';
import {use,useState} from 'react';
import {api} from '@/shared/api';
export default function Entry({params}:{params:Promise<{token:string}>}) {
 const {token}=use(params);const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="narrow hero"><p className="eyebrow">Trân trọng kính mời</p><h1>Một ngày đặc biệt.<br/>Một người đặc biệt.</h1><p>Đón nhận lời mời dành riêng cho bạn.</p>{error&&<p className="error" role="alert">{error}</p>}<button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const data=await api<{invitationId:string}>('/guest-links/redeem','POST',{token});window.location.replace(`/invitation/${data.invitationId}`);}catch{setError('Thiệp chưa mở hoặc hiện không khả dụng. Vui lòng thử lại sau hoặc liên hệ người gửi.');setBusy(false);}}}>Tiếp tục tới lời mời</button></main>;
}