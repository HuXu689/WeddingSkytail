'use client';
import {useState} from 'react';
import {api} from '@/shared/api';
import type {MediaAsset} from '@/shared/media-types';
import {Confirm} from './ui';

/** Keep draft/published references intact: deleting an asset must never publish a change. */
export function MusicLibrary({music,busy,run}:{music:MediaAsset[];busy:boolean;run:(task:()=>Promise<unknown>,message:string)=>Promise<boolean>}){
 const [pending,setPending]=useState<MediaAsset|null>(null),[error,setError]=useState('');
 async function remove(){
  if(!pending)return;
  setError('');
  await run(async()=>{
   try{
    await api(`/admin/media/${pending.id}`,'DELETE');
    // Close only after DELETE succeeds, even if refreshing the list later fails.
    setPending(null);
   }catch(cause){
    setError(cause instanceof Error?cause.message:'Không thể xóa tệp nhạc. Vui lòng thử lại.');
    throw cause;
   }
  },'Đã xóa tệp nhạc khỏi thư viện.');
 }
 return <><div className="music-list">{music.map(row=>{
  const inUse=row.draft_music||row.published_music;
  return <article className="music-item" key={row.id}>
   <div><strong>{row.original_name}</strong><small>{Math.max(1,Math.round(row.bytes/1024))} KB{row.draft_music?' · đang chọn cho bản nháp':''}{row.published_music?' · đang dùng trên thiệp':''}</small>
    {inUse&&<p className="field-hint">Chưa thể xóa tệp đang được dùng. <a href="/admin/wedding">Mở trang Thiệp cưới</a>, mục 4: chọn “Không dùng nhạc nền” hoặc tệp khác rồi lưu bản nháp.{row.published_music?' Tệp này còn ở bản đã phát hành: sau khi kiểm tra các thay đổi nháp, bạn cần phát hành để thay nhạc trên thiệp công khai.':''} Sau đó quay lại và tải lại thư viện để xóa tệp.</p>}
   </div>
   <audio controls preload="none" src={`/api/v1/admin/media/${row.id}/audio`}>Trình duyệt của bạn không phát được tệp nhạc này.</audio>
   <button type="button" className="secondary" disabled={busy||inUse} onClick={()=>{setError('');setPending(row);}}>Xóa tệp nhạc</button>
  </article>;
 })}</div>{pending&&<Confirm title="Xóa tệp nhạc này?" busy={busy} error={error} onClose={()=>{setPending(null);setError('');}} onConfirm={()=>void remove()}>Tệp “{pending.original_name}” sẽ bị xóa vĩnh viễn khỏi máy chủ. Chỉ có thể xóa khi tệp không còn được chọn cho bản nháp hoặc bản đã phát hành.</Confirm>}</>;
}