'use client';
import {use,useEffect,useState} from 'react';
import {api} from '@/shared/api';
import {WeddingCanvas,type WeddingDesign} from '@/features/invitation/design';
export default function PublicWedding({params}:{params:Promise<{slug:string}>}) {
 const {slug}=use(params);const [data,setData]=useState<WeddingDesign|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setData(null);setError('');api<WeddingDesign>(`/public/weddings/${slug}`).then(value=>{if(active)setData(value);}).catch(()=>{if(active)setError('Thiệp chung chưa được công bố hoặc tạm thời không thể tải.');});return()=>{active=false;};},[slug]);
 return <main className="public-wedding-page">{data?<><WeddingCanvas design={data}/><p className="public-invitation-note">Thông tin buổi tiệc và xác nhận tham dự nằm trong lời mời riêng được gửi tới bạn.</p></>:<section className="hero"><h1>Một lời mời</h1><p role="status">{error||'Đang tải thiệp…'}</p></section>}</main>;
}