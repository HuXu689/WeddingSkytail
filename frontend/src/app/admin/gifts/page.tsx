'use client';
import {useAdmin} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading} from '@/features/admin/ui';
import {GiftEditor} from '@/features/admin/gift-editor';
import type {GiftConfiguration} from '@/shared/invitation-features';

export default function GiftsPage(){
 const state=useAdmin<GiftConfiguration>('/admin/gifts');
 return <><Heading title="Quà mừng" description="Chuẩn bị mã QR do chính bạn cung cấp. Lưu nháp không thay đổi hộp quà đang phát hành."/>
  <Feedback {...state} retry={()=>void state.reload().catch(()=>{})}/>
  {!state.data&&!state.error&&<Loading/>}
  {state.data&&<GiftEditor initial={state.data}/>}
 </>;
}