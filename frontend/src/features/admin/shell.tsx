'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {api} from '@/shared/api';
const navigation=[['/admin','Tổng quan','◈'],['/admin/wedding','Thiệp cưới','❀'],['/admin/media','Thư viện ảnh','▧'],['/admin/events','Buổi tiệc','▦'],['/admin/invitations','Khách & lời mời','♡'],['/admin/import','Nhập danh sách','⇧'],['/admin/responses','Phản hồi','✓'],['/admin/audit','Nhật ký','≡']];
export function AdminShell({children}:{children:React.ReactNode}){
 const path=usePathname();const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(path==='/admin/login')return <>{children}</>;
 return <div className="admin-shell"><aside className="sidebar"><Link href="/admin" className="brand"><span aria-hidden="true">❧</span><strong>Ngày chung đôi</strong><small>Chăm chút từng lời mời</small></Link><nav aria-label="Quản trị">{navigation.map(([href,title,icon])=><Link key={href} href={href} className={path===href?'active':''} aria-current={path===href?'page':undefined}><span aria-hidden="true">{icon}</span>{title}</Link>)}</nav><div className="sidebar-foot"><p>Đẹp trong từng chi tiết.<br/>Rõ ràng trong từng lời mời.</p><a href="/w/our-wedding" target="_blank" rel="noreferrer">Xem thiệp chung ↗</a></div></aside><div className="admin-workspace"><header className="admin-topbar"><span>Không gian chuẩn bị ngày vui</span><button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/auth/logout','POST');window.location.replace('/admin/login');}catch{setError('Chưa thể đăng xuất. Vui lòng thử lại.');setBusy(false);}}}>Đăng xuất</button></header>{error&&<p className="error" role="alert">{error}</p>}<main className="admin-main">{children}</main></div></div>;
}