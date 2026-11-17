'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {api,uploadFile} from '@/shared/api';
import type {MediaAsset} from '@/shared/media-types';
import {useAdmin} from '@/features/admin/use-admin';
import {MusicLibrary} from '@/features/admin/music-library';
import {Heading,Feedback,Loading,Empty,Confirm} from '@/features/admin/ui';

const MAX_ALBUM=200;
const PAGE_SIZE=24;

type FilterKind='ALL'|'ALBUM'|'UNUSED'|'HERO';

async function prepareImageForUpload(file:File):Promise<File>{
 const needsConversion=file.type==='image/webp'||file.size>4*1024*1024;
 if(!needsConversion||typeof createImageBitmap!=='function')return file;
 try{
  const bitmap=await createImageBitmap(file);
  const longest=Math.max(bitmap.width,bitmap.height);
  if(!needsConversion&&longest<=2400){bitmap.close();return file;}
  if(file.type!=='image/webp'&&longest<=2400&&file.size<=6*1024*1024){bitmap.close();return file;}
  const scale=Math.min(1,2400/longest);
  const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx){bitmap.close();return file;}
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.drawImage(bitmap,0,0,width,height);bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
  if(!blob||blob.size>=file.size&&file.type==='image/jpeg')return file;
  const stem=file.name.replace(/\.[^.]+$/,'')||'anh';
  return new File([blob],`${stem}.jpg`,{type:'image/jpeg'});
 }catch{
  return file;
 }
}

export default function MediaPage(){
 const state=useAdmin<MediaAsset[]>('/admin/media');
 const [surface,setSurface]=useState<'DRAFT'|'PUBLISHED'>('DRAFT');
 const [selected,setSelected]=useState<string[]>([]);
 const [albumInitialized,setAlbumInitialized]=useState(false);
 const [heroMsg,setHeroMsg]=useState(false);
 const [pending,setPending]=useState<MediaAsset|null>(null);
 const [bulkDeleteConfirm,setBulkDeleteConfirm]=useState(false);
 const [filter,setFilter]=useState<FilterKind>('ALL');
 const [query,setQuery]=useState('');
 const [page,setPage]=useState(0);
 const [dragging,setDragging]=useState(false);
 const [autoAddAlbum,setAutoAddAlbum]=useState(true);
 const [uploadStatus,setUploadStatus]=useState<{total:number;done:number;ok:number;failed:string[]}|null>(null);
 const [noticeExtra,setNoticeExtra]=useState('');
 const [errorExtra,setErrorExtra]=useState('');
 const albumDirtyRef=useRef(false);

 async function run(task:()=>Promise<unknown>,message:string){return state.run(task,message);}

 const rows=state.data||[];
 const images=useMemo(()=>rows.filter(row=>row.kind==='IMAGE'),[rows]);
 const music=useMemo(()=>rows.filter(row=>row.kind==='AUDIO'),[rows]);

 const serverAlbumIds=useMemo(()=>
  images.filter(row=>row.draft_album)
   .sort((a,b)=>(a.draft_album_order??0)-(b.draft_album_order??0))
   .map(row=>row.id),
 [images]);

 const albumDirty=albumInitialized&&JSON.stringify(selected)!==JSON.stringify(serverAlbumIds);
 albumDirtyRef.current=albumDirty;

 useEffect(()=>{
  if(!state.data)return;
  if(!albumInitialized||!albumDirtyRef.current){
   setSelected(serverAlbumIds);
   setAlbumInitialized(true);
  }
 },[state.data,serverAlbumIds,albumInitialized]);

 async function uploadBatch(fileList:FileList|File[]){
  const files=Array.from(fileList).filter(f=>f.size>0);
  if(!files.length)return;
  setNoticeExtra('');setErrorExtra('');
  const progress={total:files.length,done:0,ok:0,failed:[] as string[]};
  setUploadStatus({...progress});
  const uploadedIds:string[]=[];
  let cursor=0;
  const concurrency=Math.min(3,files.length);
  async function worker(){
   while(cursor<files.length){
    const idx=cursor++;
    const raw=files[idx];
    try{
     const prepared=await prepareImageForUpload(raw);
     const res=await uploadFile<{id:string}>('/admin/media',prepared);
     uploadedIds.push(res.id);
     progress.ok++;
    }catch(err){
     progress.failed.push(`${raw.name}: ${err instanceof Error?err.message:'Không tải lên được'}`);
    }finally{
     progress.done++;
     setUploadStatus({...progress,failed:[...progress.failed]});
    }
   }
  }
  await Promise.all(Array.from({length:concurrency},()=>worker()));
  if(autoAddAlbum&&uploadedIds.length>0){
   const merged=Array.from(new Set([...selected,...uploadedIds])).slice(0,MAX_ALBUM);
   try{
    await api('/admin/media/album/DRAFT','PUT',{ids:merged});
    setSelected(merged);
    setAlbumInitialized(false);
    setNoticeExtra(`Đã tải lên ${progress.ok}/${progress.total} ảnh và tự động thêm vào Album bản nháp (${merged.length}/${MAX_ALBUM} ảnh).`);
   }catch(err){
    setSelected(merged);
    setErrorExtra(err instanceof Error?err.message:'Đã tải ảnh lên nhưng chưa tự lưu được danh sách album.');
   }
  }else if(progress.ok>0){
   setNoticeExtra(`Đã tải lên ${progress.ok}/${progress.total} ảnh.`);
  }
  if(progress.failed.length>0){
   setErrorExtra(`Có ${progress.failed.length} ảnh lỗi: ${progress.failed.slice(0,3).join(' · ')}${progress.failed.length>3?' …':''}`);
  }
  await state.reload().catch(()=>{});
 }

 async function upload(event:React.ChangeEvent<HTMLInputElement>){
  const files=event.target.files;
  if(!files?.length)return;
  await uploadBatch(files);
  event.target.value='';
 }

 async function uploadMusic(event:React.ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];if(!file)return;
  await run(()=>uploadFile('/admin/media/audio',file),'Đã tải tệp nhạc lên. Hãy chọn tệp này trong mục nhạc nền của trang Thiệp cưới.');
  event.target.value='';
 }

 async function setFocal(row:MediaAsset,event:React.MouseEvent<HTMLButtonElement>){
  if(surface!=='DRAFT'||state.busy)return;
  if(!row.draft_hero&&!row.draft_album){
   setErrorExtra('Hãy đặt ảnh này làm ảnh bìa hoặc lưu vào album trước khi chỉnh điểm lấy nét.');
   return;
  }
  setErrorExtra('');
  const rect=event.currentTarget.getBoundingClientRect();
  const x=Math.round(Math.max(0,Math.min(100,((event.clientX-rect.left)/rect.width)*100)));
  const y=Math.round(Math.max(0,Math.min(100,((event.clientY-rect.top)/rect.height)*100)));
  await run(()=>api(`/admin/media/${row.id}/focal/DRAFT`,'PUT',{x,y}),'Đã lưu điểm lấy nét.');
 }

 async function saveAlbumOrder(ids:string[]){
  setErrorExtra('');setNoticeExtra('');
  const ok=await run(()=>api('/admin/media/album/DRAFT','PUT',{ids}),`Đã lưu Album bản nháp (${ids.length} ảnh).`);
  if(ok)setSelected(ids);
 }

 function moveInAlbum(index:number,target:number){
  if(target<0||target>=selected.length||index===target)return;
  const next=[...selected];
  const [item]=next.splice(index,1);
  next.splice(target,0,item);
  setSelected(next);
 }

 const heroRow=images.find(row=>surface==='DRAFT'?row.draft_hero:row.published_hero)||null;
 const unusedImages=useMemo(()=>images.filter(row=>!row.draft_hero&&!row.draft_album&&!row.published_hero&&!row.published_album),[images]);

 const visibleImages=useMemo(()=>{
  const base=surface==='PUBLISHED'?images.filter(row=>row.published_hero||row.published_album):images;
  const kw=query.trim().toLowerCase();
  return base.filter(row=>{
   if(kw&&!row.original_name.toLowerCase().includes(kw))return false;
   if(filter==='ALBUM')return surface==='DRAFT'?selected.includes(row.id):row.published_album;
   if(filter==='HERO')return surface==='DRAFT'?row.draft_hero:row.published_hero;
   if(filter==='UNUSED')return !row.draft_hero&&!row.draft_album&&!row.published_hero&&!row.published_album;
   return true;
  });
 },[images,surface,query,filter,selected]);

 const totalPages=Math.max(1,Math.ceil(visibleImages.length/PAGE_SIZE));
 const safePage=Math.min(page,totalPages-1);
 const pagedImages=visibleImages.slice(safePage*PAGE_SIZE,(safePage+1)*PAGE_SIZE);
 const assetMap=useMemo(()=>new Map(images.map(item=>[item.id,item])),[images]);
 const uploading=Boolean(uploadStatus&&uploadStatus.done<uploadStatus.total);

 async function deleteUnusedBatch(){
  if(!unusedImages.length)return;
  setBulkDeleteConfirm(false);
  setErrorExtra('');setNoticeExtra('');
  let deleted=0;
  for(const item of unusedImages){
   try{await api(`/admin/media/${item.id}`,'DELETE');deleted++;}catch{}
  }
  setNoticeExtra(`Đã xóa ${deleted}/${unusedImages.length} ảnh chưa dùng khỏi thư viện.`);
  await state.reload().catch(()=>{});
 }

 return <>
  <Heading title="Thư viện ảnh của ngày vui" description="Hỗ trợ tải lên hàng loạt (~100+ ảnh), sắp xếp Album tới 200 ảnh, đặt ảnh bìa & điểm lấy nét. Chỉ ảnh trong bản đã phát hành mới xuất hiện trên thiệp công khai."/>
  <Feedback error={errorExtra||state.error} notice={noticeExtra||state.notice} retry={()=>void state.reload().catch(()=>{})}/>

  <section className="card media-upload">
   <div className="section-heading">
    <div><h2>Thêm ảnh hàng loạt</h2><p className="field-hint">Hỗ trợ chọn cùng lúc nhiều ảnh (JPEG, PNG, WebP). Ảnh quá lớn được tự nén tối ưu trước khi gửi lên máy chủ (tối đa {MAX_ALBUM} ảnh trong Album).</p></div>
    <span className="badge">{images.length} ảnh trong thư viện</span>
   </div>
   <div
    className={`media-dropzone${dragging?' is-dragging':''}`}
    onDragOver={e=>{e.preventDefault();if(!uploading)setDragging(true);}}
    onDragLeave={()=>setDragging(false)}
    onDrop={e=>{e.preventDefault();setDragging(false);if(!uploading&&e.dataTransfer.files?.length)void uploadBatch(e.dataTransfer.files);}}
   >
    <p><strong>Kéo &amp; thả nhiều ảnh vào đây</strong> hoặc chọn từ thiết bị</p>
    <label className="upload-button">
     {uploading?`Đang tải ${uploadStatus!.done}/${uploadStatus!.total}…`:'Chọn nhiều ảnh từ thiết bị'}
     <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={state.busy||uploading}/>
    </label>
    <label className="media-auto-add">
     <input type="checkbox" checked={autoAddAlbum} onChange={e=>setAutoAddAlbum(e.target.checked)} disabled={uploading}/>
     Tự động thêm ảnh tải lên vào Album bản nháp (tối đa {MAX_ALBUM} ảnh)
    </label>
    {uploadStatus&&<div className="media-upload-progress" role="status">
     <div className="media-progress-track"><span style={{width:`${Math.round((uploadStatus.done/Math.max(1,uploadStatus.total))*100)}%`}}/></div>
     <small>Đã xử lý {uploadStatus.done} / {uploadStatus.total} ảnh · Thành công: {uploadStatus.ok}{uploadStatus.failed.length>0?` · Lỗi: ${uploadStatus.failed.length}`:''}</small>
    </div>}
   </div>
  </section>

  {surface==='DRAFT'&&heroRow&&<section className="card media-hero-card">
   <div className="section-heading">
    <div>
     <h2>Ảnh bìa bản nháp (Hero)</h2>
     <p className="field-hint">Bấm trực tiếp lên vùng khuôn mặt hoặc điểm nhấn trên ảnh để đặt điểm lấy nét ({heroRow.focal_x}%, {heroRow.focal_y}%).</p>
    </div>
    <a className="button secondary" href="/admin/wedding">Về trang Thiệp cưới →</a>
   </div>
   <div className="media-hero-grid">
    <button type="button" className="media-focal media-hero-focal" onClick={event=>void setFocal(heroRow,event)} disabled={state.busy} aria-label={`Đặt điểm lấy nét cho ảnh bìa ${heroRow.original_name}`}>
     <img src={`/api/v1/admin/media/${heroRow.id}/content`} alt={heroRow.original_name} style={{objectPosition:`${heroRow.focal_x}% ${heroRow.focal_y}%`}}/>
     <span className="focal-marker" style={{left:`${heroRow.focal_x}%`,top:`${heroRow.focal_y}%`}} aria-hidden="true"/>
    </button>
    <div className="media-hero-info">
     <strong>{heroRow.original_name}</strong>
     <small>{heroRow.width} × {heroRow.height} · Lấy nét: {heroRow.focal_x}%, {heroRow.focal_y}%</small>
     <p className="field-hint">Điểm lấy nét được giữ nguyên khi bạn bấm Phát hành trong trang Thiệp cưới.</p>
    </div>
   </div>
  </section>}

  <section className="card music-upload">
   <div className="section-heading">
    <div><h2>Nhạc nền cho thiệp</h2><p className="field-hint">MP3, M4A hoặc OGG, tối đa 20 MB mỗi tệp. Có thể bật/tắt tự phát trong trang Thiệp cưới. Nếu trình duyệt chặn, khách bấm icon nhạc để nghe. Chọn nhạc ở mục 4 trong trang Thiệp cưới.</p></div>
    <span className="badge">{music.length} tệp nhạc</span>
   </div>
   <label className="upload-button">Chọn tệp nhạc từ thiết bị<input type="file" accept="audio/mpeg,audio/mp4,audio/ogg" onChange={uploadMusic} disabled={state.busy}/></label>
   {music.length===0?<Empty>Chưa có tệp nhạc nào. Hãy tải tệp đầu tiên lên.</Empty>:<MusicLibrary music={music} busy={state.busy} run={run}/>}
  </section>

  <section className="card">
   <div className="section-heading">
    <div>
     <h2>{surface==='DRAFT'?'Quản lý ảnh & Album bản nháp':'Ảnh đang phát hành trên thiệp'}</h2>
     <p className="field-hint">{surface==='DRAFT'?`Đã chọn ${selected.length}/${MAX_ALBUM} ảnh cho Album bản nháp. Sau khi lưu Album, nhớ vào trang Thiệp cưới để Phát hành.`:'Các ảnh đang hiển thị công khai cho khách mời.'}</p>
    </div>
    <div className="row">
     <button type="button" className={surface==='DRAFT'?'':'secondary'} onClick={()=>{setSurface('DRAFT');setPage(0);setHeroMsg(false);}}>Bản nháp ({images.length})</button>
     <button type="button" className={surface==='PUBLISHED'?'':'secondary'} onClick={()=>{setSurface('PUBLISHED');setPage(0);setHeroMsg(false);}}>Đã phát hành</button>
    </div>
   </div>

   {surface==='DRAFT'&&<>
    <div className="media-album-bar">
     <div className="row">
      <button type="button" disabled={!albumDirty||state.busy||uploading} onClick={()=>void saveAlbumOrder(selected)}>
       {albumDirty?`Lưu Album bản nháp (${selected.length} ảnh)`:`Album bản nháp đã lưu (${selected.length}/${MAX_ALBUM})`}
      </button>
      {albumDirty&&<button type="button" className="secondary" disabled={state.busy} onClick={()=>setSelected(serverAlbumIds)}>Hoàn tác thay đổi</button>}
      <button type="button" className="secondary" disabled={state.busy||images.length===0||selected.length>=Math.min(images.length,MAX_ALBUM)} onClick={()=>setSelected(images.slice(0,MAX_ALBUM).map(r=>r.id))}>Chọn tất cả (tối đa {MAX_ALBUM})</button>
      {selected.length>0&&<button type="button" className="secondary" disabled={state.busy} onClick={()=>setSelected([])}>Bỏ chọn hết</button>}
     </div>
     {albumDirty&&<p className="design-warning">Bạn vừa thay đổi danh sách hoặc thứ tự album ({selected.length} ảnh). Bấm “Lưu Album bản nháp” để lưu lại.</p>}
    </div>

    {selected.length>0&&<details className="media-album-sorter">
     <summary>Sắp xếp thứ tự Album bản nháp ({selected.length} ảnh)</summary>
     <div className="media-sorter-strip">
      {selected.map((id,idx)=>{
       const asset=assetMap.get(id);
       return <div className="media-sorter-item" key={id}>
        <img src={`/api/v1/admin/media/${id}/thumb`} alt={asset?.original_name||`Ảnh ${idx+1}`} loading="lazy" decoding="async" onError={e=>{const img=e.currentTarget;const full=`/api/v1/admin/media/${id}/content`;if(!img.src.endsWith('/content')&&!img.src.endsWith('/fallback/detail.jpg'))img.src=full;else img.src='/fallback/detail.jpg';}}/>
        <span className="media-sorter-num">#{idx+1}</span>
        <div className="media-sorter-actions">
         <button type="button" className="secondary" disabled={idx===0} onClick={()=>moveInAlbum(idx,idx-1)} aria-label={`Đưa ảnh ${idx+1} lên`}>←</button>
         <button type="button" className="secondary" disabled={idx===selected.length-1} onClick={()=>moveInAlbum(idx,idx+1)} aria-label={`Đưa ảnh ${idx+1} xuống`}>→</button>
         <button type="button" className="secondary" onClick={()=>setSelected(old=>old.filter(x=>x!==id))} aria-label={`Gỡ ảnh ${idx+1} khỏi album`}>×</button>
        </div>
       </div>;
      })}
     </div>
    </details>}
   </>}

   <div className="media-toolbar">
    <div className="row">
     <button type="button" className={filter==='ALL'?'':'secondary'} onClick={()=>{setFilter('ALL');setPage(0);}}>Tất cả ({surface==='DRAFT'?images.length:images.filter(r=>r.published_hero||r.published_album).length})</button>
     <button type="button" className={filter==='ALBUM'?'':'secondary'} onClick={()=>{setFilter('ALBUM');setPage(0);}}>Trong album ({surface==='DRAFT'?selected.length:images.filter(r=>r.published_album).length})</button>
     <button type="button" className={filter==='HERO'?'':'secondary'} onClick={()=>{setFilter('HERO');setPage(0);}}>Ảnh bìa</button>
     {surface==='DRAFT'&&<button type="button" className={filter==='UNUSED'?'':'secondary'} onClick={()=>{setFilter('UNUSED');setPage(0);}}>Chưa dùng ({unusedImages.length})</button>}
    </div>
    <div className="row">
     <input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Tìm theo tên tệp ảnh…" aria-label="Tìm ảnh"/>
     {surface==='DRAFT'&&unusedImages.length>0&&<button type="button" className="danger" disabled={state.busy||uploading} onClick={()=>setBulkDeleteConfirm(true)}>Xóa {unusedImages.length} ảnh chưa dùng</button>}
    </div>
   </div>

   {!state.data&&!state.error&&<Loading/>}
   {state.data&&visibleImages.length===0&&<Empty>{surface==='PUBLISHED'?'Chưa có ảnh nào đang phát hành.':'Không có ảnh phù hợp bộ lọc.'}</Empty>}

   <div className="media-grid">
    {pagedImages.map(row=>{
     const inDraftAlbum=selected.includes(row.id);
     const albumPos=inDraftAlbum?selected.indexOf(row.id)+1:null;
     const imgSrc=surface==='DRAFT'?`/api/v1/admin/media/${row.id}/thumb`:`/media/${row.id}-thumb.jpg`;
     const canFocal=surface==='DRAFT'&&(row.draft_hero||row.draft_album);
     return <article className={`media-card ${inDraftAlbum?'selected':''} ${row.draft_hero?'is-hero':''}`} key={row.id}>
      <button type="button" className="media-focal" onClick={event=>void setFocal(row,event)} disabled={state.busy||surface!=='DRAFT'} aria-label={canFocal?`Đặt điểm lấy nét cho ${row.original_name}`:`Xem ${row.original_name}`}>
       <img src={imgSrc} alt={row.original_name} loading="lazy" decoding="async" style={{objectPosition:`${row.focal_x}% ${row.focal_y}%`}} onError={e=>{const img=e.currentTarget;const full=surface==='DRAFT'?`/api/v1/admin/media/${row.id}/content`:`/media/${row.id}.jpg`;if(!img.src.endsWith(full)&&!img.src.endsWith('/fallback/detail.jpg'))img.src=full;else img.src='/fallback/detail.jpg';}}/>
       {canFocal&&<span className="focal-marker" style={{left:`${row.focal_x}%`,top:`${row.focal_y}%`}} aria-hidden="true"/>}
       {albumPos!==null&&surface==='DRAFT'&&<span className="media-album-order-pill">Album #{albumPos}</span>}
      </button>
      <div className="media-meta">
       <strong>{row.original_name}</strong>
       <small>{row.width} × {row.height} · {Math.max(1,Math.round(row.bytes/1024))} KB{canFocal?` · Lấy nét ${row.focal_x}%, ${row.focal_y}%`:''}</small>
       {surface==='DRAFT'&&<div className="row">
        <button type="button" className={row.draft_hero?'':'secondary'} disabled={state.busy||row.draft_hero} onClick={async()=>{const ok=await run(()=>api('/admin/media/hero/DRAFT','PUT',{id:row.id}),'Đã chọn ảnh bìa cho bản nháp.');if(ok)setHeroMsg(true);}}>
         {row.draft_hero?'Ảnh bìa ✓':'Đặt làm ảnh bìa'}
        </button>
        <button type="button" className={inDraftAlbum?'':'secondary'} disabled={state.busy||(!inDraftAlbum&&selected.length>=MAX_ALBUM)} onClick={()=>setSelected(old=>old.includes(row.id)?old.filter(id=>id!==row.id):[...old,row.id])}>
         {inDraftAlbum?'Gỡ khỏi album':'Thêm vào album'}
        </button>
       </div>}
       <p className="media-flags">
        {row.draft_hero&&<span className="badge badge-hero">Ảnh bìa nháp</span>}
        {row.published_hero&&<span className="badge badge-published">Ảnh bìa đang phát hành</span>}
        {row.draft_album&&<span className="badge badge-active">Album nháp</span>}
        {row.published_album&&<span className="badge badge-ready">Album đang phát hành</span>}
        {!row.draft_hero&&!row.draft_album&&!row.published_hero&&!row.published_album&&<span className="field-hint">Chưa dùng</span>}
       </p>
       {surface==='DRAFT'&&<button type="button" className="danger" disabled={state.busy||row.draft_hero||row.draft_album||row.published_hero||row.published_album} onClick={()=>setPending(row)}>Xóa ảnh</button>}
      </div>
     </article>;
    })}
   </div>

   {totalPages>1&&<nav className="pagination" aria-label="Phân trang thư viện ảnh">
    <button type="button" className="secondary" disabled={safePage===0} onClick={()=>setPage(safePage-1)}>← Trang trước</button>
    <span>Trang {safePage+1} / {totalPages} · {visibleImages.length} ảnh</span>
    <button type="button" className="secondary" disabled={safePage>=totalPages-1} onClick={()=>setPage(safePage+1)}>Trang sau →</button>
   </nav>}
   {heroMsg&&<p className="success" role="status">Đã chọn ảnh bìa cho bản nháp. Ảnh bìa chỉ xuất hiện trên thiệp công khai sau khi bạn phát hành thiết kế trong mục Thiệp cưới.</p>}
  </section>

  {pending&&<Confirm title="Xóa ảnh này?" busy={state.busy} onClose={()=>setPending(null)} onConfirm={async()=>{if(await run(()=>api(`/admin/media/${pending.id}`,'DELETE'),'Đã xóa ảnh khỏi thư viện.'))setPending(null);}}>Ảnh “{pending.original_name}” sẽ bị xóa vĩnh viễn khỏi thư viện nếu không còn được dùng trong bản nháp hoặc bản đã phát hành.</Confirm>}
  {bulkDeleteConfirm&&<Confirm title={`Xóa ${unusedImages.length} ảnh chưa dùng?`} busy={state.busy} onClose={()=>setBulkDeleteConfirm(false)} onConfirm={()=>void deleteUnusedBatch()}>Thao tác này chỉ xóa những ảnh chưa được gắn vào ảnh bìa hay album ở cả bản nháp và bản đã phát hành.</Confirm>}
 </>;
}
