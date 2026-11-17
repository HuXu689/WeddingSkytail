'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {api} from '@/shared/api';
import {isActiveRoute} from '@/shared/routes';

const navigation=[['/admin','Tổng quan','◈',''],['/admin/wedding','Thiệp cưới','❀',''],['/admin/media','Thư viện ảnh','▧',''],['/admin/events','Buổi tiệc','▦',''],['/admin/invitations','Khách & lời mời','♡',''],['/admin/import','Nhập danh sách','⇧',''],['/admin/exports','Xuất QR','▤','OWNER'],['/admin/print','Trung tâm in','⎙',''],['/admin/responses','Phản hồi','✓',''],['/admin/reminders','Nhắc chưa phản hồi','◔',''],['/admin/wishes','Sổ lời chúc','✎',''],['/admin/gifts','Quà mừng','◇','OWNER'],['/admin/audit','Nhật ký','≡','OWNER'],['/admin/users','Quản trị người dùng','⚙','OWNER'],['/admin/account','Tài khoản của tôi','☺','']];

function NavIcon({href}:{href:string}){
 const props={width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
 switch(href){
  case '/admin': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  case '/admin/wedding': return <svg {...props}><path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9Z"/></svg>;
  case '/admin/media': return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>;
  case '/admin/events': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
  case '/admin/invitations': return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 7 10 6 10-6"/></svg>;
  case '/admin/import': return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
  case '/admin/exports': return <svg {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 21h2M21 14v2"/></svg>;
  case '/admin/print': return <svg {...props}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
  case '/admin/responses': return <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
  case '/admin/reminders': return <svg {...props}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>;
  case '/admin/wishes': return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
  case '/admin/gifts': return <svg {...props}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>;
  case '/admin/audit': return <svg {...props}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
  case '/admin/users': return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  default: return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>;
 }
}

export function AdminShell({children}:{children:React.ReactNode}){
 const path=usePathname();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[role,setRole]=useState<string|null>(null);
 useEffect(()=>{void api<{role:string}>('/auth/me').then(me=>setRole(me.role)).catch(()=>setRole(null));},[]);
 // Owner-only entries stay hidden until the role is known, so an editor never sees a menu they cannot use (T25).
 const visible=navigation.filter(([, , , ownerOnly])=>ownerOnly!=='OWNER'||role==='OWNER');
 const roleLabel=role==='EDITOR'?'Trợ lý nội dung':role==='OWNER'?'Chủ tiệc':'Đang tải…';
 if(path==='/admin/login')return <>{children}</>;
 return <div className="admin-shell"><aside className="sidebar"><Link href="/admin" className="brand"><span aria-hidden="true">❧</span><strong>Ngày chung đôi</strong><small>Chăm chút từng lời mời</small></Link><nav aria-label="Quản trị">{visible.map(([href,title])=><Link key={href} href={href} className={isActiveRoute(path,href)?'active':''} aria-current={isActiveRoute(path,href)?'page':undefined}><span><NavIcon href={href}/></span>{title}</Link>)}</nav><div className="sidebar-foot"><p>Đẹp trong từng chi tiết.<br/>Rõ ràng trong từng lời mời.</p><a href="/w/our-wedding" target="_blank" rel="noreferrer">Xem thiệp chung ↗</a></div></aside><div className="admin-workspace"><header className="admin-topbar"><span>Không gian chuẩn bị ngày vui</span><span className="role-badge">{roleLabel}</span><button className="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/auth/logout','POST');window.location.replace('/admin/login');}catch{setError('Chưa thể đăng xuất. Vui lòng thử lại.');setBusy(false);}}}>Đăng xuất</button></header>{error&&<p className="error" role="alert">{error}</p>}<main className="admin-main">{children}</main></div></div>;
}
