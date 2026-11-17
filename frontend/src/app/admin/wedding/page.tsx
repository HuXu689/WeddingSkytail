'use client';
import {useEffect,useState} from 'react';
import {api} from '@/shared/api';
import type {Me,Wedding} from '@/shared/admin-types';
import {useAdmin} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Confirm,Badge} from '@/features/admin/ui';
import {PolicyForm} from '@/features/admin/policy-form';
import {LayoutEditor} from '@/features/admin/layout-editor';
import {SectionEditor} from '@/features/admin/section-editor';
import {DesignEditor} from '@/features/admin/design-editor';
import type {LayoutItem} from '@/features/invitation/layout';
import type {ContentSection} from '@/features/invitation/sections';

type WeddingTab='design'|'layout'|'sections'|'access';

export default function WeddingPage(){
 const state=useAdmin<Wedding>('/admin/wedding');
 const [me,setMe]=useState<Me|null>(null);
 const [tab,setTab]=useState<WeddingTab>('design');
 const [publishConfirm,setPublishConfirm]=useState(false);
 const [unpublish,setUnpublish]=useState(false);
 const [designDirty,setDirty]=useState(false);
 const [sectionDirty,setSectionDirty]=useState(false);
 const [layoutDirty,setLayoutDirty]=useState(false);
 const [liveLayout,setLiveLayout]=useState<LayoutItem[]|undefined>(undefined);
 const [liveSections,setLiveSections]=useState<ContentSection[]|undefined>(undefined);

 useEffect(()=>{void api<Me>('/auth/me').then(setMe).catch(()=>setMe(null));},[]);

 const isOwner=me?.role==='OWNER';
 const dirty=designDirty||sectionDirty||layoutDirty;
 const dirtyList=[designDirty&&'Thiết kế & nội dung chính',layoutDirty&&'Bố cục & thứ tự',sectionDirty&&'Nội dung chi tiết'].filter(Boolean) as string[];

 return <>
  <Heading title="Thiết kế lời mời của hai bạn" description="Chỉnh mẫu, nội dung, bố cục và xem trước ngay. Lưu bản nháp không làm thay đổi thiệp đang phát hành cho tới khi Chủ tiệc bấm Phát hành."/>
  <Feedback {...state} retry={()=>void state.reload().catch(()=>{})}/>
  {!state.data&&!state.error&&<Loading/>}
  {state.data&&<>
   <section className="card wedding-status-card">
    <div className="wedding-status-head">
     <div className="row">
      <Badge value={state.data.published?'PUBLISHED':'DRAFT'}/>
      {state.data.has_unpublished_changes
       ?<span className="badge badge-scheduled">Có thay đổi nháp chưa phát hành</span>
       :<span className="badge badge-ready">Bản phát hành đang đồng bộ</span>}
      <span className="badge">Album nháp: {state.data.albumUrls.length} ảnh</span>
     </div>
     <div className="row">
      <a className="button secondary" href="/w/our-wedding" target="_blank" rel="noreferrer">Xem thiệp chung ↗</a>
      {isOwner&&<button disabled={state.busy||dirty} onClick={()=>setPublishConfirm(true)}>Phát hành bản đã lưu</button>}
      {isOwner&&<button disabled={state.busy||dirty||!state.data.published} className="secondary" onClick={()=>setUnpublish(true)}>Ngừng công bố</button>}
     </div>
    </div>
    {dirty&&<p className="design-warning">Bạn đang sửa chưa lưu tại: <strong>{dirtyList.join(', ')}</strong>. Hãy lưu bản nháp ở mục đó trước khi chuyển mục hoặc phát hành để tránh xung đột phiên bản.</p>}
    {!isOwner&&me&&<p className="field-hint">Bạn đang đăng nhập bằng vai trò Trợ lý nội dung: có thể lưu bản nháp thiết kế, bố cục và nội dung chi tiết; chỉ Chủ tiệc mới có quyền Phát hành và thay đổi chính sách truy cập.</p>}
    {isOwner&&state.data.published&&state.data.mode==='MANUAL_CLOSED'&&<p className="section-empty-warning"><span>!</span> Thiệp chung (/w/our-wedding) đang công bố, nhưng <strong>Truy cập toàn bộ lời mời riêng (/i/...) đang Đóng thủ công</strong>. Khách mở link riêng sẽ thấy thiệp chưa mở cho tới khi bạn mở trong tab Truy cập &amp; Theo dõi.</p>}
   </section>

   <nav className="wedding-workspace-tabs" aria-label="Khu vực chỉnh sửa thiệp">
    <button type="button" aria-pressed={tab==='design'} onClick={()=>setTab('design')}>1. Thiết kế &amp; Nội dung chính{designDirty?' *':''}</button>
    <button type="button" aria-pressed={tab==='layout'} onClick={()=>setTab('layout')}>2. Bố cục &amp; Thứ tự{layoutDirty?' *':''}</button>
    <button type="button" aria-pressed={tab==='sections'} onClick={()=>setTab('sections')}>3. Nội dung chi tiết{sectionDirty?' *':''}</button>
    <button type="button" aria-pressed={tab==='access'} onClick={()=>setTab('access')}>4. Truy cập &amp; Theo dõi</button>
   </nav>

   <div className={tab==='design'?'wedding-tab-panel':'wedding-tab-panel is-hidden'}>
    <DesignEditor
     onDirty={setDirty}
     wedding={state.data}
     busy={state.busy||sectionDirty||layoutDirty}
     otherDirty={sectionDirty||layoutDirty}
     isOwner={isOwner}
     liveLayout={liveLayout}
     liveSections={liveSections}
     save={body=>state.run(()=>api('/admin/wedding/design','PUT',body),'Đã lưu bản nháp thiết kế. Thiệp đã phát hành chưa thay đổi.')}
     publish={()=>state.run(()=>api('/admin/wedding/publish','POST',{expectedVersion:state.data!.version}),'Đã phát hành mẫu và nội dung mới.')}
    />
   </div>

   <div className={tab==='layout'?'wedding-tab-panel':'wedding-tab-panel is-hidden'}>
    <LayoutEditor
     preview={{names:state.data.draft_names,message:state.data.draft_message,theme:state.data.draft_theme,accent:state.data.draft_accent,story:state.data.draft_story,footer:state.data.draft_footer,show_story:state.data.draft_show_story,heroUrl:state.data.heroUrl,heroPosition:state.data.heroPosition,albumUrls:state.data.albumUrls,sections:liveSections??state.data.sections}}
     busy={state.busy||designDirty||sectionDirty}
     onDirty={setLayoutDirty}
     onChangeDraft={setLiveLayout}
     save={layout=>state.run(()=>api('/admin/wedding/layout','PUT',{layout,templateVersion:1,contentSchemaVersion:1,expectedVersion:state.data!.version}),'Đã lưu nháp bố cục. Bản phát hành chưa thay đổi.')}
    />
   </div>

   <div className={tab==='sections'?'wedding-tab-panel':'wedding-tab-panel is-hidden'}>
    <SectionEditor
     busy={state.busy||designDirty||layoutDirty}
     onDirty={setSectionDirty}
     onChangeDraft={setLiveSections}
     save={sections=>state.run(()=>api('/admin/wedding/sections','PUT',{sections,templateVersion:1,contentSchemaVersion:2,expectedVersion:state.data!.version}),'Đã lưu nháp nội dung tùy chọn. Bản phát hành chưa thay đổi.')}
    />
   </div>

   <div className={tab==='access'?'wedding-tab-panel':'wedding-tab-panel is-hidden'}>
    <section className="card">
     <div className="section-heading">
      <div><h2>Ghi nhận lượt mở thiệp</h2><p className="field-hint">Khi bật, website ghi thời điểm khách bấm “Mở thiệp” để bạn theo dõi lời mời. Lượt mở không xác minh đúng người nhận, không công khai lịch sử của khách và không xóa bản ghi cũ khi bạn tắt.</p></div>
      <Badge value={state.data.tracking?'TRACKING_ENABLE':'TRACKING_DISABLE'}/>
     </div>
     {isOwner?<div className="row">
      <button disabled={state.busy||dirty||state.data.tracking} onClick={()=>void state.run(()=>api('/admin/wedding/tracking','POST',{enabled:true,expectedVersion:state.data!.version}),'Đã bật ghi nhận lượt mở thiệp.')}>Bật ghi nhận</button>
      <button className="secondary" disabled={state.busy||dirty||!state.data.tracking} onClick={()=>void state.run(()=>api('/admin/wedding/tracking','POST',{enabled:false,expectedVersion:state.data!.version}),'Đã tắt ghi nhận lượt mở. Bản ghi cũ vẫn được giữ.')}>Tắt ghi nhận</button>
     </div>:<p className="field-hint">Chỉ Chủ tiệc mới có thể thay đổi thiết lập ghi nhận lượt mở.</p>}
    </section>
    <section className="card">
     <h2>Truy cập toàn bộ lời mời riêng</h2>
     <p className="muted">Kiểm soát cổng mở cho các link riêng (`/i/...`). Đóng truy cập không đổi QR và không xóa phản hồi; không ảnh hưởng tới thiệp chung (`/w/our-wedding`) nếu đã công bố.</p>
     {isOwner?<PolicyForm key={`policy-${state.data.version}`} policy={state.data} global busy={state.busy||dirty} save={body=>state.run(()=>api('/admin/access-policy','PUT',body))}/>:<p className="field-hint">Chỉ Chủ tiệc mới có quyền thay đổi chính sách truy cập toàn bộ lời mời.</p>}
    </section>
   </div>
  </>}
  {publishConfirm&&state.data&&<Confirm title="Phát hành toàn bộ bản nháp?" busy={state.busy} onClose={()=>setPublishConfirm(false)} onConfirm={async()=>{if(await state.run(()=>api('/admin/wedding/publish','POST',{expectedVersion:state.data!.version}),'Đã phát hành mẫu, nội dung, bố cục và ảnh mới lên thiệp chính thức.'))setPublishConfirm(false);}}>Tất cả thay đổi đã lưu (thiết kế, ảnh bìa, album, nhạc nền, bố cục và nội dung tùy chọn) sẽ hiển thị công khai trên thiệp chung và lời mời riêng. Link và QR của khách giữ nguyên.</Confirm>}
  {unpublish&&state.data&&<Confirm title="Ngừng công bố thiệp?" busy={state.busy} onClose={()=>setUnpublish(false)} onConfirm={async()=>{if(await state.run(()=>api('/admin/wedding/unpublish','POST',{expectedVersion:state.data!.version}),'Đã ngừng công bố thiệp chung.'))setUnpublish(false);}}>Khách sẽ không thể xem thiệp cho đến khi công bố lại. Nội dung đã lưu và link vẫn được giữ nguyên.</Confirm>}
 </>;
}
