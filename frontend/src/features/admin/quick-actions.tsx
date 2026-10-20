'use client';
import Link from 'next/link';
import {useAdmin} from './use-admin';

export function QuickActions(){
 const me=useAdmin<{role:string}>('/auth/me');
 return <section className="card" aria-labelledby="quick-actions-title">
  <div className="section-heading"><div><p className="eyebrow">Tiết kiệm thời gian</p><h2 id="quick-actions-title">Thao tác nhanh</h2></div></div>
  <div className="quick-actions">
   <Link className="button" href="/admin/invitations?create=1#add-guest">＋ Thêm khách mời</Link>
   <Link className="button secondary" href="/admin/reminders">Nhắc khách chưa phản hồi</Link>
   <Link className="button secondary" href="/admin/invitations?openFilter=NO_OPEN">Khách chưa ghi nhận mở</Link>
   <Link className="button secondary" href="/admin/responses">Cập nhật phản hồi</Link>
   <Link className="button secondary" href="/admin/wishes">Duyệt lời chúc</Link>
   <Link className="button secondary" href="/admin/wedding">Chỉnh sửa thiệp</Link>
   {me.data?.role==='OWNER'&&<Link className="button secondary" href="/admin/exports">Xuất QR khách mời</Link>}
  </div>
 </section>;
}